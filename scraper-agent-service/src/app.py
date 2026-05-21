import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import settings
from src.logging_config import configure_logging
from src.routes.base import router as base_router
from src.routes.alerts import router as alerts_router, run_scrape_and_process_cycle

configure_logging(settings.log_level)
logger = logging.getLogger(__name__)


async def periodic_scraper():
    """Periodic background task that crawls the UW emergency blog for updates."""
    logger.info("Initializing periodic scraper background poller...")
    
    await asyncio.sleep(5.0)
    
    interval = settings.poll_interval_seconds
    logger.info(f"Background scraper poller started. Crawl interval: {interval} seconds")
    
    while True:
        try:
            logger.info("Background poller running scraping cycle...")
            result = await run_scrape_and_process_cycle(force=False)
            
            if result.get("updated"):
                logger.info(f"Background poller detected an update! New Alert ID: {result['alert']['id']}")
            else:
                logger.info("Background poller completed crawl. No new updates.")
                
        except Exception as e:
            logger.error(f"Error in background scraper poller loop: {e}", exc_info=True)
            
        logger.debug(f"Poller sleeping for {interval} seconds...")
        await asyncio.sleep(interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles service startup and shutdown events (Lifespan pattern)."""
    logger.info("Starting scraper-agent-service...")
    
    poller_task = asyncio.create_task(periodic_scraper())
    
    yield
    
    logger.info("Shutting down scraper-agent-service...")
    poller_task.cancel()
    try:
        await poller_task
    except asyncio.CancelledError:
        logger.info("Background scraper poller task successfully cancelled.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="UW Scraper Agent Service",
        description="Crawls & processes the UW Alert Blog using OpenAI gpt-5.2 and geocodes building locations.",
        version="1.0.0",
        lifespan=lifespan
    )
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.include_router(base_router)
    app.include_router(alerts_router)
    
    return app


app = create_app()
