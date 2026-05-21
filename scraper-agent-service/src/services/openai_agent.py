import json
import logging
import re
from typing import Optional
from pydantic import BaseModel, Field
from openai import AsyncOpenAI

from src.config import settings

logger = logging.getLogger(__name__)


class ExtractedAlert(BaseModel):
    title: str = Field(description="A concise summary of the alert or advisory")
    description: str = Field(description="A clear description of the incident, active updates, and safety instructions")
    severity: str = Field(description="The severity level of the alert. Must be one of: 'info', 'warning', 'critical'")
    location_name: Optional[str] = Field(None, description="The name of the UW building or location mentioned in the alert (e.g. 'Fluke Hall', 'Nordheim Court'), or null if not specified")
    status: str = Field(description="The active status of the incident. Must be one of: 'active', 'resolved', 'investigating'")


class OpenAiAgent:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.openai_api_key
        self.model = model or settings.openai_general_model
        
        if self.api_key and self.api_key != "mock-key-for-now" and not self.api_key.startswith("your-"):
            self.client = AsyncOpenAI(api_key=self.api_key)
            logger.info(f"OpenAI Client initialized with model: {self.model}")
        else:
            self.client = None
            logger.warning("No valid OPENAI_API_KEY found. OpenAI Agent will operate in local fallback mode.")

    async def extract_alert_details(self, title: str, raw_content_html: str) -> ExtractedAlert:
        """
        Takes raw scraped content and parses it into a structured ExtractedAlert format.
        If OpenAI API key is not configured, falls back to local regex/rule-based parsing.
        """
        if self.client:
            try:
                logger.info(f"Invoking OpenAI API ({self.model}) to extract structured alert details")
                
                system_prompt = (
                    "You are an expert emergency communications classifier. "
                    "Your job is to read raw HTML or text of a university emergency alert blog post "
                    "and extract structured information exactly matching the requested JSON schema.\n\n"
                    "Rules:\n"
                    "1. severity: must be one of 'info', 'warning', or 'critical'. Use 'critical' for violent crimes, active shooter, fires in progress, or severe life-safety threats. Use 'warning' for active advisories (gas leaks, power outages, localized building closures). Use 'info' for resolved alerts, minor updates, or general advisories.\n"
                    "2. status: must be one of 'active', 'resolved', or 'investigating'. If the text says 'extinguished', 'restored', 'clear', 'all clear', 'no longer need to remain inside', use 'resolved'.\n"
                    "3. location_name: Extract the primary UW building name (e.g., 'Fluke Hall', 'Nordheim Court', 'Denny Hall', 'Red Square'). Only output the building name, or null if none is mentioned."
                )
                
                user_content = f"Post Title: {title}\n\nRaw Content HTML/Text:\n{raw_content_html}"
                
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.0
                )
                
                result_text = response.choices[0].message.content
                logger.info(f"OpenAI Response received: {result_text}")
                
                data = json.loads(result_text)
                
                severity = data.get("severity", "info").lower()
                if severity not in ["info", "warning", "critical"]:
                    severity = "info"
                    
                status = data.get("status", "active").lower()
                if status not in ["active", "resolved", "investigating"]:
                    status = "active"
                    
                return ExtractedAlert(
                    title=data.get("title", title),
                    description=data.get("description", ""),
                    severity=severity,
                    location_name=data.get("location_name"),
                    status=status
                )
            except Exception as e:
                logger.error(f"Failed to extract details using OpenAI: {e}. Falling back to local parser.", exc_info=True)
                
        return self._local_fallback_extract(title, raw_content_html)

    def _local_fallback_extract(self, title: str, text: str) -> ExtractedAlert:
        """Rule-based regex fallback parser for emergency alerts when OpenAI is not available."""
        logger.info("Running local rule-based fallback parser for alert")
        
        clean_text = re.sub(r'<[^>]+>', ' ', text)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        status = "active"
        if any(w in clean_text.lower() for w in ["resolved", "extinguished", "restored", "all clear", "no longer need", "reopening"]):
            status = "resolved"
        elif "investigating" in clean_text.lower() or "investigation" in clean_text.lower():
            status = "investigating"
            
        severity = "info"
        if any(w in clean_text.lower() for w in ["homicide", "stabbing", "shooting", "weapon", "violent", "assault", "critical"]):
            severity = "critical"
        elif any(w in clean_text.lower() for w in ["fire", "leak", "outage", "advisory", "warning", "police response"]):
            severity = "warning"
            
        location_name = None
        building_match = re.search(r'\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:Hall|Court|Square|Center|Library|Building\s+\d+|Apartments))\b', title + " " + clean_text)
        if building_match:
            location_name = building_match.group(1).strip()
            
        description = clean_text[:250] + "..." if len(clean_text) > 250 else clean_text
        
        return ExtractedAlert(
            title=title,
            description=description,
            severity=severity,
            location_name=location_name,
            status=status
        )
