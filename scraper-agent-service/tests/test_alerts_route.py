import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.routes.alerts import run_scrape_and_process_cycle, state_manager

HTML_INITIAL = """
<article id="post-4581" class="post-4581 post type-post status-publish format-standard hentry">
	<header class="entry-header">
		<h2 class="entry-title"><a href="https://emergency.uw.edu/2026/05/19/uw-advisory-seattle-34/" rel="bookmark">UW Advisory Seattle &#8211; Fluke Hall</a></h2>
		<div class="entry-meta">
			<span class="posted-on">Posted on <a href="https://emergency.uw.edu/2026/05/19/uw-advisory-seattle-34/" rel="bookmark"><time class="entry-date published" datetime="2026-05-19T20:01:39-07:00">May 19, 2026 8:01 pm</time></a> </span>
		</div>
	</header>
	<div class="entry-content">
		<p>Seattle firefighters are extinguishing a small fire at Fluke Hall. Avoid the area.</p>
	</div>
</article>
"""

HTML_UPDATED = """
<article id="post-4581" class="post-4581 post type-post status-publish format-standard hentry">
	<header class="entry-header">
		<h2 class="entry-title"><a href="https://emergency.uw.edu/2026/05/19/uw-advisory-seattle-34/" rel="bookmark">UW Advisory Seattle &#8211; Fluke Hall</a></h2>
		<div class="entry-meta">
			<span class="posted-on">Posted on <a href="https://emergency.uw.edu/2026/05/19/uw-advisory-seattle-34/" rel="bookmark"><time class="entry-date published" datetime="2026-05-19T20:01:39-07:00">May 19, 2026 8:01 pm</time><time class="updated" datetime="2026-05-20T14:17:00-07:00">May 20, 2026 2:17 pm</time></a> </span>
		</div>
	</header>
	<div class="entry-content">
		<p>UPDATE at 8:25 p.m.: The fire has been extinguished.</p>
	</div>
</article>
"""


@pytest.mark.asyncio
async def test_run_scrape_and_process_cycle_detects_updates():
    # 1. Clear State Manager values so we start with empty state
    state_manager.file_path = None
    state_manager.state.last_processed_id = None
    state_manager.state.latest_alert = None
    state_manager.state.webhooks = []

    # 2. First scrape (initial alert)
    with patch("src.routes.alerts.fetch_emergency_page", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = HTML_INITIAL
        
        result = await run_scrape_and_process_cycle(force=False)
        assert result["updated"] is True
        assert result["alert"]["id"] == "post-4581"
        assert result["alert"]["last_updated"] == "2026-05-19T20:01:39-07:00"

    # 3. Second scrape (same article, same timestamp -> no update)
    with patch("src.routes.alerts.fetch_emergency_page", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = HTML_INITIAL
        
        result2 = await run_scrape_and_process_cycle(force=False)
        assert result2["updated"] is False
        assert result2["alert"]["last_updated"] == "2026-05-19T20:01:39-07:00"

    # 4. Third scrape (same article ID, updated timestamp -> should detect update)
    with patch("src.routes.alerts.fetch_emergency_page", new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = HTML_UPDATED
        
        result3 = await run_scrape_and_process_cycle(force=False)
        assert result3["updated"] is True
        assert result3["alert"]["id"] == "post-4581"
        assert result3["alert"]["last_updated"] == "2026-05-20T14:17:00-07:00"
