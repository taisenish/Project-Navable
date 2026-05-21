import asyncio
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, HttpUrl
import httpx

from src.services.scraper import fetch_emergency_page, parse_articles
from src.services.openai_agent import OpenAiAgent
from src.services.geocoder import Geocoder, Coordinate
from src.services.state_manager import StateManager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts")

state_manager = StateManager()
geocoder = Geocoder()
openai_agent = OpenAiAgent()


class WebhookRegistration(BaseModel):
    url: HttpUrl


class AlertResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    location: Optional[Coordinate] = None
    status: str
    is_resolved: bool
    last_updated: str
    link: str


class ScraperStatus(BaseModel):
    last_processed_id: Optional[str]
    webhooks_count: int
    has_cached_alert: bool
    openai_fallback_mode: bool


async def broadcast_alert_to_webhooks(webhooks: List[str], alert_data: Dict[str, Any]):
    """Asynchronously broadcasts the structured alert to all registered webhooks."""
    if not webhooks:
        return

    logger.info(f"Broadcasting new alert to {len(webhooks)} webhooks")
    async with httpx.AsyncClient() as client:
        tasks = []
        for url in webhooks:
            tasks.append(send_webhook(client, url, alert_data))
        await asyncio.gather(*tasks, return_exceptions=True)


async def send_webhook(client: httpx.AsyncClient, url: str, alert_data: Dict[str, Any]):
    """Sends a single webhook POST request."""
    try:
        logger.info(f"Sending webhook to {url}")
        response = await client.post(url, json=alert_data, timeout=5.0)
        if response.status_code >= 400:
            logger.warning(f"Webhook {url} returned status code {response.status_code}")
        else:
            logger.info(f"Webhook {url} delivered successfully")
    except Exception as e:
        logger.error(f"Failed to send webhook to {url}: {e}")


async def push_alert_to_backend(alert_data: Dict[str, Any]):
    """Attempts to automatically push a scraped alert to the main Navable backend."""
    backend_url = "http://127.0.0.1:8000/api/v1/alerts"
    try:
        logger.info(f"Automatically pushing scraped alert to backend: {backend_url}")
        async with httpx.AsyncClient() as client:
            backend_payload = {
                "id": alert_data["id"],
                "title": alert_data["title"],
                "description": alert_data["description"],
                "severity": alert_data["severity"],
                "status": alert_data["status"],
                "is_resolved": alert_data["is_resolved"]
            }
            if alert_data.get("location"):
                backend_payload["location"] = alert_data["location"]
            else:
                backend_payload["location"] = None
                
            response = await client.post(backend_url, json=backend_payload, timeout=5.0)
            if response.status_code >= 400:
                logger.warning(f"Failed to push alert to backend. Status: {response.status_code}")
            else:
                logger.info("Successfully pushed scraped alert to backend!")
    except Exception as e:
        logger.error(f"Error pushing alert to backend: {e}")


async def run_scrape_and_process_cycle(force: bool = False) -> Dict[str, Any]:
    """
    Core scraping and processing cycle. Can be called by background poller 
    or manually triggered via endpoints.
    """
    html = await fetch_emergency_page()
    articles = parse_articles(html)
    
    if not articles:
        logger.warning("No articles found on the emergency page.")
        return {"updated": False, "message": "No articles found.", "alert": None}
        
    latest_article = articles[0]
    last_id = state_manager.get_last_processed_id()
    
    logger.info(f"Scraped latest article ID: '{latest_article.id}', last processed ID: '{last_id}'")
    
    is_new = latest_article.id != last_id
    if is_new or force:
        logger.info(f"Processing alert update (is_new={is_new}, force={force})")
        
        extracted = await openai_agent.extract_alert_details(
            title=latest_article.title,
            raw_content_html=latest_article.raw_content
        )
        
        coord = geocoder.geocode(extracted.location_name)
        
        alert_payload = AlertResponse(
            id=latest_article.id,
            title=extracted.title,
            description=extracted.description,
            severity=extracted.severity,
            location=coord,
            status=extracted.status,
            is_resolved=(extracted.status == "resolved"),
            last_updated=latest_article.updated_date or latest_article.published_date,
            link=latest_article.link
        )
        
        payload_dict = alert_payload.model_dump()
        state_manager.set_latest_alert(payload_dict)
        state_manager.set_last_processed_id(latest_article.id)
        
        asyncio.create_task(push_alert_to_backend(payload_dict))
        
        webhooks = state_manager.get_webhooks()
        if webhooks:
            asyncio.create_task(broadcast_alert_to_webhooks(webhooks, payload_dict))
            
        return {
            "updated": True,
            "message": "Scraped and processed new alert successfully.",
            "alert": payload_dict
        }
    else:
        cached_alert = state_manager.get_latest_alert()
        return {
            "updated": False,
            "message": "No new alerts or updates found since last scrape.",
            "alert": cached_alert
        }


@router.post("/scrape", response_model=Dict[str, Any])
async def trigger_scrape(
    force: bool = Query(default=False, description="Force re-processing of the latest alert even if it has already been processed")
):
    """
    Manually triggers a scrape of the UW emergency blog, processes the latest article, 
    and notifies registered webhooks if an update is found.
    """
    try:
        result = await run_scrape_and_process_cycle(force=force)
        if not result.get("alert") and not result.get("updated") and "No articles found" in result.get("message", ""):
            raise HTTPException(status_code=404, detail="No articles found on the emergency page.")
        return result
    except httpx.HTTPError as e:
        logger.error(f"HTTP error during scraping: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch emergency page: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error during trigger_scrape: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest", response_model=Dict[str, Any])
def get_latest_alert():
    """Returns the latest processed alert stored in the state."""
    alert = state_manager.get_latest_alert()
    if not alert:
        raise HTTPException(status_code=404, detail="No alert history found. Run /scrape first.")
    return alert


@router.get("/status", response_model=ScraperStatus)
def get_status():
    """Returns status metrics of the scraper agent service."""
    return ScraperStatus(
        last_processed_id=state_manager.get_last_processed_id(),
        webhooks_count=len(state_manager.get_webhooks()),
        has_cached_alert=state_manager.get_latest_alert() is not None,
        openai_fallback_mode=openai_agent.client is None
    )


@router.post("/webhooks", response_model=Dict[str, Any])
def register_webhook(webhook: WebhookRegistration):
    """Registers a webhook URL to receive POST notifications on alert updates."""
    url_str = str(webhook.url)
    added = state_manager.add_webhook(url_str)
    if added:
        return {"status": "success", "message": f"Webhook registered successfully: {url_str}"}
    return {"status": "success", "message": f"Webhook already registered: {url_str}"}


@router.delete("/webhooks", response_model=Dict[str, Any])
def unregister_webhook(webhook: WebhookRegistration):
    """Unregisters a webhook URL."""
    url_str = str(webhook.url)
    removed = state_manager.remove_webhook(url_str)
    if removed:
        return {"status": "success", "message": f"Webhook unregistered successfully: {url_str}"}
    raise HTTPException(status_code=404, detail=f"Webhook not found: {url_str}")
