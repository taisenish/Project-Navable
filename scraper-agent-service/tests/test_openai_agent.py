import pytest
from unittest.mock import AsyncMock, MagicMock
from src.services.openai_agent import OpenAiAgent, ExtractedAlert


@pytest.mark.asyncio
async def test_local_fallback_extraction():
    # Test fallback parser with active critical alert
    agent = OpenAiAgent(api_key="mock-key-for-now")
    
    # Nordheim Court laundry room incident
    alert1 = await agent.extract_alert_details(
        title="UW Alert",
        raw_content_html="<p>Homicide stabbing at Nordheim Court Apartments building 7 laundry room. Avoid area.</p>"
    )
    assert alert1.status == "active"
    assert alert1.severity == "critical"
    assert alert1.location_name == "Nordheim Court Apartments"
    assert "Nordheim Court" in alert1.description

    # Gas leak advisory resolved
    alert2 = await agent.extract_alert_details(
        title="UW Advisory – Smell of natural gas",
        raw_content_html="<p>UPDATE 9:57 a.m.: Firefighters located and extinguished the gas leak at Haggett Hall. Gas turned off, building reopened.</p>"
    )
    assert alert2.status == "resolved"
    assert alert2.severity == "warning"
    assert alert2.location_name == "Haggett Hall"


@pytest.mark.asyncio
async def test_openai_api_mock():
    # Test OpenAI completion flow using a mock client
    agent = OpenAiAgent(api_key="real-looking-key")
    
    mock_choice = MagicMock()
    mock_choice.message.content = '{"title": "MOCK ALERT TITLE", "description": "MOCK SUMMARY", "severity": "critical", "location_name": "Kane Hall", "status": "active"}'
    
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    
    # Mock completions.create as async mock returning mock_response
    agent.client = MagicMock()
    agent.client.chat = MagicMock()
    agent.client.chat.completions = MagicMock()
    agent.client.chat.completions.create = AsyncMock(return_value=mock_response)
    
    alert = await agent.extract_alert_details(
        title="Original Title",
        raw_content_html="Raw HTML contents"
    )
    
    assert alert.title == "MOCK ALERT TITLE"
    assert alert.description == "MOCK SUMMARY"
    assert alert.severity == "critical"
    assert alert.location_name == "Kane Hall"
    assert alert.status == "active"
    
    # Assert parameters
    agent.client.chat.completions.create.assert_called_once()
