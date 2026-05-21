from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def read_root():
    return {
        "service": "scraper-agent-service",
        "description": "UW Alert Emergency Blog Scraper & Processing Agent Service",
        "status": "healthy"
    }


@router.get("/health")
def health_check():
    return {"status": "ok"}
