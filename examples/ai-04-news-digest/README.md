# AI News Digest

An AI-powered news digest application demonstrating Upsun's multi-app architecture with workers. The frontend (Node.js) handles user requests while a background worker (Python) fetches news from RSS feeds and generates AI summaries.

## Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Redis    │◀────│   Worker        │
│   (Node.js)     │     │   (Queue)   │     │   (Python)      │
│                 │     └─────────────┘     │                 │
│  - Serves UI    │                         │  - Polls queue  │
│  - REST API     │                         │  - Fetches RSS  │
│  - Queues jobs  │                         │  - AI summary   │
└─────────────────┘                         └─────────────────┘
```

## How it works

1. User selects topics and clicks "Generate Digest"
2. Frontend queues a job in Redis
3. Python worker picks up the job from the queue
4. Worker fetches news from RSS feeds for selected topics
5. Worker sends articles to OpenAI for summarization
6. Worker stores the completed digest in Redis
7. Frontend polls for completion and displays the result

## Local development

### Prerequisites

- Node.js 22+
- Python 3.12+
- Redis running locally
- OpenAI API key

### Setup

1. Start Redis locally:
```bash
docker run -d -p 6379:6379 redis:7
```

2. Set up the frontend:
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your settings
npm run dev
```

3. Set up the worker (in a separate terminal):
```bash
cd worker
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your OpenAI key
python main.py
```

4. Open http://localhost:3000

## Deploying to Upsun

1. Create a new Upsun project:
```bash
upsun project:create
```

2. Set the OpenAI API key:
```bash
upsun variable:create --name OPENAI_API_KEY --value "sk-..." --sensitive true
```

3. Push to deploy:
```bash
git push upsun main
```

The multi-app configuration in `.upsun/config.yaml` will deploy:
- The Node.js frontend as a web application
- The Python worker as a background worker
- Redis as a shared service

## Configuration

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | - |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4o-mini` |
| `PORT` | Frontend server port | `3000` |
| `REDIS_HOST` | Redis host (local dev) | `localhost` |

### Available topics

- `technology`: Tech news from Ars Technica, The Verge
- `business`: Business news from Bloomberg, Financial Times
- `science`: Science news from Science Daily, Nature
- `world`: World news from BBC, NY Times

## Project structure

```
04-news-digest/
├── frontend/               # Node.js frontend
│   ├── src/
│   │   └── index.ts       # Express server
│   ├── public/
│   │   └── index.html     # UI
│   ├── package.json
│   └── tsconfig.json
├── worker/                 # Python worker
│   ├── main.py            # Worker script
│   └── requirements.txt
├── .upsun/
│   └── config.yaml        # Multi-app Upsun config
└── README.md
```

## Workers vs cron jobs

This example uses a **worker** instead of a cron job because:

- **Immediate processing**: Users get results as soon as the worker finishes, not on a fixed schedule
- **Long-running process**: The worker runs continuously, ready to pick up jobs instantly
- **Queue-based**: Multiple requests can be queued and processed in order

Cron jobs would be better for:
- Fixed-schedule tasks (e.g., generate a digest every morning at 8am)
- Short-duration operations
- Tasks that don't need immediate user feedback
