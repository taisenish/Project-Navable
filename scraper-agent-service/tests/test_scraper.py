import pytest
from src.services.scraper import parse_articles, ScrapedArticle

SAMPLE_HTML = """
<article id="post-4581" class="post-4581 post type-post status-publish format-standard hentry">
	<header class="entry-header">
		<h2 class="entry-title"><a href="https://emergency.uw.edu/2026/05/19/uw-advisory-seattle-34/" rel="bookmark">UW Advisory Seattle &#8211; Fluke Hall</a></h2>
		<div class="entry-meta">
			<span class="posted-on">Posted on <a href="https://emergency.uw.edu/2026/05/19/uw-advisory-seattle-34/" rel="bookmark"><time class="entry-date published" datetime="2026-05-19T20:01:39-07:00">May 19, 2026 8:01 pm</time><time class="updated" datetime="2026-05-19T20:32:19-07:00">May 19, 2026 8:32 pm</time></a> </span>
		</div>
	</header>
	<div class="entry-content">
		<p>UPDATE at 8:26 p.m.: The small fire at the CoMotion Hardware Incubator in Fluke Hall has been extinguished.</p>
	</div>
</article>
<article id="post-4531" class="post-4531 post type-post status-publish format-standard hentry">
	<header class="entry-header">
		<h2 class="entry-title"><a href="https://emergency.uw.edu/2026/05/10/uw-alert-18/" rel="bookmark">UW Alert</a></h2>
		<div class="entry-meta">
			<span class="posted-on">Posted on <time class="entry-date published" datetime="2026-05-10T22:42:20-07:00">May 10, 2026 10:42 pm</time></span>
		</div>
	</header>
	<div class="entry-content">
		<p>Homicide investigation at Nordheim Court laundry room.</p>
	</div>
</article>
"""


def test_parse_articles():
    articles = parse_articles(SAMPLE_HTML)
    assert len(articles) == 2
    
    # Verify first article
    art1 = articles[0]
    assert art1.id == "post-4581"
    assert art1.title == "UW Advisory Seattle – Fluke Hall"  # Note: BS4 decodes html entities
    assert art1.link == "https://emergency.uw.edu/2026/05/19/uw-advisory-seattle-34/"
    assert art1.published_date == "2026-05-19T20:01:39-07:00"
    assert art1.updated_date == "2026-05-19T20:32:19-07:00"
    assert "CoMotion Hardware Incubator" in art1.raw_content
    assert "<div" in art1.raw_content
    
    # Verify second article (lacks explicit updated datetime)
    art2 = articles[1]
    assert art2.id == "post-4531"
    assert art2.title == "UW Alert"
    assert art2.link == "https://emergency.uw.edu/2026/05/10/uw-alert-18/"
    assert art2.published_date == "2026-05-10T22:42:20-07:00"
    assert art2.updated_date == "2026-05-10T22:42:20-07:00"
    assert "Nordheim Court" in art2.raw_content
