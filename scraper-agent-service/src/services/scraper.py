import logging
import httpx
from bs4 import BeautifulSoup
from typing import List, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

UW_EMERGENCY_URL = "https://emergency.uw.edu/"


class ScrapedArticle(BaseModel):
    id: str
    title: str
    link: str
    published_date: str
    updated_date: Optional[str] = None
    raw_content: str


async def fetch_emergency_page(client: Optional[httpx.AsyncClient] = None) -> str:
    """Fetches the raw HTML content of the UW Emergency page."""
    url = UW_EMERGENCY_URL
    logger.info(f"Fetching UW emergency page: {url}")
    
    if client is not None:
        response = await client.get(url, timeout=15.0)
        response.raise_for_status()
        return response.text
        
    async with httpx.AsyncClient(follow_redirects=True) as temp_client:
        response = await temp_client.get(url, timeout=15.0)
        response.raise_for_status()
        return response.text


def parse_articles(html_content: str) -> List[ScrapedArticle]:
    """Parses raw HTML and extracts emergency blog articles."""
    soup = BeautifulSoup(html_content, "html.parser")
    articles = []
    
    article_nodes = soup.find_all("article")
    logger.info(f"Found {len(article_nodes)} <article> tags in HTML")
    
    for node in article_nodes:
        article_id = node.get("id", "").strip()
        if not article_id:
            classes = node.get("class", [])
            post_classes = [c for c in classes if c.startswith("post-")]
            if post_classes:
                article_id = post_classes[0]
            else:
                continue
                
        title_node = node.find(class_="entry-title")
        if not title_node:
            title_node = node.find("h2") or node.find("h3")
            
        title = "UW Alert"
        link = UW_EMERGENCY_URL
        if title_node:
            title = title_node.get_text().strip()
            a_tag = title_node.find("a")
            if a_tag and a_tag.get("href"):
                link = a_tag.get("href")
                
        published_date = ""
        updated_date = None
        
        published_node = node.find(class_="entry-date") or node.find(class_="published")
        if published_node and published_node.get("datetime"):
            published_date = published_node.get("datetime")
        else:
            time_node = node.find("time")
            if time_node and time_node.get("datetime"):
                published_date = time_node.get("datetime")
                
        updated_node = node.find(class_="updated")
        if updated_node and updated_node.get("datetime"):
            updated_date = updated_node.get("datetime")
            
        content_node = node.find(class_="entry-content")
        if content_node:
            raw_content = str(content_node)
        else:
            raw_content = node.get_text()
            
        if not published_date:
            published_date = "unknown"
            
        articles.append(ScrapedArticle(
            id=article_id,
            title=title,
            link=link,
            published_date=published_date,
            updated_date=updated_date or published_date,
            raw_content=raw_content
        ))
        
    return articles
