import os
import json
import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from src.config import settings

logger = logging.getLogger(__name__)


class ServiceState(BaseModel):
    last_processed_id: Optional[str] = None
    webhooks: List[str] = []
    latest_alert: Optional[Dict[str, Any]] = None


class StateManager:
    def __init__(self, file_path: Optional[str] = None):
        self.file_path = file_path or settings.state_file_path
        self.state = ServiceState()
        self._load_state()

    def _load_state(self):
        """Loads state from the local JSON file."""
        if not self.file_path:
            return

        if not os.path.exists(self.file_path):
            logger.info(f"State file {self.file_path} does not exist yet. Initializing default state.")
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.file_path) or ".", exist_ok=True)
            self._save_state()
            return

        try:
            logger.info(f"Loading service state from {self.file_path}")
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.state = ServiceState.model_validate(data)
            logger.info(f"State loaded. Webhooks: {len(self.state.webhooks)}, Last seen alert: {self.state.last_processed_id}")
        except Exception as e:
            logger.error(f"Failed to load state file: {e}. Using empty state.", exc_info=True)

    def _save_state(self):
        """Saves current state to the local JSON file."""
        if not self.file_path:
            return

        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.file_path) or ".", exist_ok=True)
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(self.state.model_dump(), f, indent=2)
            logger.debug(f"State successfully saved to {self.file_path}")
        except Exception as e:
            logger.error(f"Failed to save state file: {e}", exc_info=True)

    # Getters / Setters
    def get_last_processed_id(self) -> Optional[str]:
        return self.state.last_processed_id

    def set_last_processed_id(self, last_id: str):
        self.state.last_processed_id = last_id
        self._save_state()

    def get_webhooks(self) -> List[str]:
        return self.state.webhooks

    def add_webhook(self, url: str) -> bool:
        if url not in self.state.webhooks:
            self.state.webhooks.append(url)
            self._save_state()
            logger.info(f"Webhook registered: {url}")
            return True
        return False

    def remove_webhook(self, url: str) -> bool:
        if url in self.state.webhooks:
            self.state.webhooks.remove(url)
            self._save_state()
            logger.info(f"Webhook unregistered: {url}")
            return True
        return False

    def get_latest_alert(self) -> Optional[Dict[str, Any]]:
        return self.state.latest_alert

    def set_latest_alert(self, alert_data: Dict[str, Any]):
        self.state.latest_alert = alert_data
        self._save_state()
