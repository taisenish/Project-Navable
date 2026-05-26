import asyncio
import logging
import sys
from src.services.openai_agent import OpenAiAgent

logging.basicConfig(level=logging.INFO)

async def main():
    agent = OpenAiAgent()
    print("API Key:", agent.api_key[:15] + "..." if agent.api_key else "None")
    print("Client initialized:", agent.client is not None)
    
    title = "UW Advisory Seattle - Fluke Hall"
    html = """<div class="entry-content">
		<p><strong>UPDATE at 8:25 p.m.:</strong> The small fire at the CoMotion Hardware Incubator in Fluke Hall (Room 215) has been extinguished. The battery that apparently caused the fire was removed from the building. No injuries were reported. The area is reopening.</p>
	</div>"""
    
    res = await agent.extract_alert_details(title, html)
    print("Result:", res)

if __name__ == "__main__":
    asyncio.run(main())
