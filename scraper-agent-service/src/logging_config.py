import logging
import sys

SERVICE_NAME = "scraper-agent-service"

class ScraperFormatter(logging.Formatter):
    """Custom standard formatter for clean log output."""
    def format(self, record):
        log_fmt = f"[%(asctime)s] [{SERVICE_NAME}] [%(levelname)s] (%(name)s) %(message)s"
        formatter = logging.Formatter(log_fmt, datefmt="%Y-%m-%d %H:%M:%S")
        return formatter.format(record)

def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(ScraperFormatter())
    
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level.upper())
    
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
