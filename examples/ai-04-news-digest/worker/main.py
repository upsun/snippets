#!/usr/bin/env python3
"""
News Digest Worker

Continuously polls Redis for digest requests, fetches news from RSS feeds,
and uses OpenAI to generate AI-powered summaries.
"""

import base64
import json
import os
import time
from datetime import datetime, timezone

import feedparser
import httpx
import redis
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# RSS feeds for different topics
RSS_FEEDS = {
    "technology": [
        "https://feeds.arstechnica.com/arstechnica/technology-lab",
        "https://www.theverge.com/rss/index.xml",
    ],
    "business": [
        "https://feeds.bloomberg.com/markets/news.rss",
        "https://www.ft.com/?format=rss",
    ],
    "science": [
        "https://www.sciencedaily.com/rss/all.xml",
        "https://www.nature.com/nature.rss",
    ],
    "world": [
        "https://feeds.bbci.co.uk/news/world/rss.xml",
        "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
    ],
}


def get_redis_config() -> dict:
    """Get Redis connection config from Upsun relationship or environment."""
    relationships = os.environ.get("PLATFORM_RELATIONSHIPS")
    if relationships:
        parsed = json.loads(base64.b64decode(relationships).decode())
        if parsed.get("redis"):
            return {
                "host": parsed["redis"][0]["host"],
                "port": parsed["redis"][0]["port"],
            }
    return {"host": os.environ.get("REDIS_HOST", "localhost"), "port": 6379}


def fetch_feed(url: str, timeout: float = 10.0) -> list[dict]:
    """Fetch and parse an RSS feed, returning list of articles."""
    try:
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            response = client.get(url, headers={"User-Agent": "NewsDigestBot/1.0"})
            response.raise_for_status()

        feed = feedparser.parse(response.text)
        articles = []

        for entry in feed.entries[:5]:  # Limit to 5 per feed
            articles.append({
                "title": entry.get("title", "Untitled"),
                "link": entry.get("link", ""),
                "summary": entry.get("summary", entry.get("description", ""))[:500],
                "published": entry.get("published", ""),
            })

        return articles
    except Exception as e:
        print(f"[worker] Failed to fetch {url}: {e}")
        return []


def fetch_news_for_topics(topics: list[str]) -> dict[str, list[dict]]:
    """Fetch news articles for the given topics."""
    news_by_topic = {}

    for topic in topics:
        feeds = RSS_FEEDS.get(topic, [])
        articles = []

        for feed_url in feeds:
            articles.extend(fetch_feed(feed_url))

        news_by_topic[topic] = articles[:10]  # Limit to 10 articles per topic
        print(f"[worker] Fetched {len(news_by_topic[topic])} articles for {topic}")

    return news_by_topic


def generate_digest(news_by_topic: dict[str, list[dict]], openai_client: OpenAI) -> str:
    """Use OpenAI to generate a digest summary from the collected news."""
    # Build the prompt with news content
    news_content = ""
    for topic, articles in news_by_topic.items():
        news_content += f"\n## {topic.upper()}\n"
        for article in articles:
            news_content += f"- **{article['title']}**\n  {article['summary'][:200]}...\n"

    prompt = f"""You are a news editor creating a daily digest. Based on the following news articles,
create a concise, engaging summary organized by topic. Highlight the most important stories
and provide brief analysis where relevant.

Format your response in Markdown with clear headers for each topic section.
Include 2-3 key takeaways at the end.

NEWS ARTICLES:
{news_content}

Create a professional news digest:"""

    try:
        response = openai_client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": "You are a professional news editor."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=2000,
            temperature=0.7,
        )
        return response.choices[0].message.content or "Failed to generate digest."
    except Exception as e:
        print(f"[worker] OpenAI error: {e}")
        return f"Error generating digest: {e}"


def process_job(job: dict, redis_client: redis.Redis, openai_client: OpenAI) -> None:
    """Process a single digest job."""
    job_id = job["id"]
    topics = job.get("topics", ["technology", "business", "science"])

    print(f"[worker] Processing job {job_id} with topics: {topics}")

    # Update job status to processing
    job["status"] = "processing"
    job["startedAt"] = datetime.now(timezone.utc).isoformat()
    redis_client.set(f"digest:job:{job_id}", json.dumps(job), ex=3600)

    # Fetch news
    news_by_topic = fetch_news_for_topics(topics)

    # Generate digest with AI
    digest_content = generate_digest(news_by_topic, openai_client)

    # Update job with result
    job["status"] = "completed"
    job["completedAt"] = datetime.now(timezone.utc).isoformat()
    job["digest"] = digest_content
    job["articleCount"] = sum(len(articles) for articles in news_by_topic.values())

    redis_client.set(f"digest:job:{job_id}", json.dumps(job), ex=3600)
    redis_client.set("digest:latest", job_id, ex=3600)

    print(f"[worker] Completed job {job_id} with {job['articleCount']} articles")


def main():
    """Main worker loop."""
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        print("[worker] ERROR: OPENAI_API_KEY environment variable is required")
        return

    redis_config = get_redis_config()
    print(f"[worker] Connecting to Redis at {redis_config['host']}:{redis_config['port']}")

    redis_client = redis.Redis(**redis_config, decode_responses=True)
    openai_client = OpenAI(api_key=openai_key)

    print("[worker] News digest worker started, waiting for jobs...")

    while True:
        try:
            # Block waiting for jobs (timeout after 30 seconds to check for shutdown)
            result = redis_client.brpop("digest:queue", timeout=30)

            if result:
                _, job_data = result
                job = json.loads(job_data)
                process_job(job, redis_client, openai_client)

        except redis.ConnectionError as e:
            print(f"[worker] Redis connection error: {e}")
            time.sleep(5)
        except KeyboardInterrupt:
            print("[worker] Shutting down...")
            break
        except Exception as e:
            print(f"[worker] Error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
