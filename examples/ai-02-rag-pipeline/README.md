# Upsun RAG chatbot

An AI-powered chatbot that uses Retrieval-Augmented Generation (RAG) to answer questions about Upsun. Built with Node.js, LangChain, OpenAI, and Qdrant for vector search.

## Features

- **RAG pipeline** with Qdrant vector database for semantic document retrieval
- **OpenAI embeddings** (text-embedding-3-small) for document chunking and query matching
- **Debug panel** showing retrieved sources with relevance scores
- **Security hardening** with prompt injection detection, output filtering, and datamarking
- **Rate limiting** to prevent abuse
- **Streaming responses** for real-time interaction

## Architecture

- **Backend**: Express.js server with TypeScript
- **LLM**: OpenAI GPT-4o-mini (configurable) via LangChain
- **Vector DB**: Qdrant for storing and searching document embeddings
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Frontend**: Custom chat interface served as static HTML
- **Deployment**: Configured for Upsun with Qdrant service

## How it works

1. **Deploy hook**: Documentation is cloned, chunked (~1500 chars with 200 char overlap), and embedded into Qdrant
2. **User query**: When a user asks a question, it's embedded and searched against Qdrant
3. **RAG retrieval**: Top 5 most relevant document chunks are retrieved (score threshold: 0.3)
4. **LLM processing**: Retrieved context is injected into the system prompt with datamarking
5. **Streaming response**: The response streams back with a debug panel showing retrieved sources

## Local development

### Prerequisites

- Node.js 22+
- pnpm (or use corepack)
- Docker (for running Qdrant locally)
- OpenAI API key

### Setup

1. Start Qdrant locally:

```bash
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant
```

2. Install dependencies:

```bash
pnpm install
```

3. Clone the Upsun documentation:

```bash
git clone --depth 1 --single-branch --branch main \
  https://github.com/platformsh/platformsh-docs.git docs
```

4. Create `.env` file:

```bash
cp .env.example .env
```

5. Add your OpenAI API key to `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
QDRANT_HOST=localhost
QDRANT_PORT=6333
```

6. Embed the documentation into Qdrant:

```bash
pnpm embed
```

### Run locally

Development mode with auto-reload:

```bash
pnpm dev
```

Production build and run:

```bash
pnpm build
pnpm start
```

Open http://localhost:3000 in your browser.

## Upsun deployment

### Prerequisites

- Upsun CLI installed and authenticated
- An Upsun organization

### Deploy

1. Create a new Upsun project:

```bash
upsun project:create
```

2. Set the OpenAI API key as a project variable:

```bash
upsun variable:create --level project --name env:OPENAI_API_KEY --value "sk-your-key-here" --sensitive true --visible-build false --visible-runtime true
```

3. Push to deploy:

```bash
git add .
git commit -m "Deploy RAG chatbot"
upsun push
```

The deployment process will:
1. **Build**: Install dependencies, clone documentation, compile TypeScript
2. **Deploy**: Embed all documentation chunks into Qdrant vector database
3. **Start**: Launch the Express server

## Project structure

```
02-rag-pipeline/
├── src/
│   ├── index.ts           # Express server and API routes
│   ├── chat.ts            # LangChain chat logic with RAG retrieval
│   ├── qdrant.ts          # Qdrant client for vector search
│   ├── validation.ts      # Input validation and injection detection
│   ├── rate-limiter.ts    # Rate limiting middleware
│   └── filters.ts         # Output filtering and leakage detection
├── scripts/
│   ├── build-context.ts   # (Legacy) Build script for context stuffing
│   └── embed-docs.ts      # Embed documentation into Qdrant
├── public/
│   └── index.html         # Chat UI with debug panel
├── qdrant/
│   └── config.yaml        # Qdrant vector database configuration
├── .upsun/
│   └── config.yaml        # Upsun deployment with Qdrant app
├── package.json
├── tsconfig.json
├── biome.json             # Linting and formatting config
└── README.md
```

## Qdrant configuration

Qdrant runs as a composable application on Upsun (not a managed service). The `.upsun/config.yaml` defines two apps:

```yaml
applications:
  chatbot:
    type: "nodejs:24"
    relationships:
      qdrant: "qdrant:http"

  qdrant:
    type: "composable:25.11"
    container_profile: HIGH_MEMORY
    stack:
      - "qdrant"
    source:
      root: "qdrant"
    web:
      commands:
        start: "qdrant --config-path /app/config.yaml"
    mounts:
      "storage":
        source: "storage"
        source_path: "storage"
```

The `qdrant/config.yaml` configures the Qdrant server with:
- HTTP port 8888 (Upsun's default)
- Storage paths using the mounted directories
- CORS enabled for API access

Connection details are provided via `PLATFORM_RELATIONSHIPS` environment variable.

## Security features

This chatbot includes several security hardening techniques:

1. **Prompt injection detection**: Regex patterns to detect and block common injection attempts
2. **Datamarking**: Microsoft Spotlighting technique (prefixing data with ^) to separate instructions from data
3. **Message enclosure**: User messages wrapped in random boundaries to prevent prompt escape
4. **Output filtering**: Strips external links (except docs.upsun.com), images, and credential patterns
5. **N-gram overlap detection**: Monitors for system prompt leakage in responses
6. **Rate limiting**: 10 requests per minute per IP address
7. **Input validation**: Message length caps, history sanitization

## Configuration

Environment variables:

- `OPENAI_API_KEY` (required): Your OpenAI API key
- `OPENAI_MODEL` (optional): OpenAI model to use (default: `gpt-4o-mini`)
- `PORT` (optional): Server port (default: `3000`)
- `QDRANT_HOST` (optional): Qdrant hostname (default: `localhost`)
- `QDRANT_PORT` (optional): Qdrant port (default: `6333`)

## Linting and formatting

This project uses Biome for linting and formatting:

```bash
# Check code
pnpm lint

# Fix issues automatically
pnpm lint:fix

# Format code
pnpm format
```

## RAG vs context stuffing

This project demonstrates the RAG approach compared to the context stuffing approach in `01-langchain-chatbot`:

| Aspect | Context stuffing | RAG (this project) |
|--------|-----------------|---------------------|
| Context size | Entire docs (~50K tokens) | Top 5 chunks (~2K tokens) |
| Token cost | High per request | Lower per request |
| Relevance | All docs included | Only relevant chunks |
| Latency | Higher (large prompt) | Lower + embedding time |
| Transparency | None | Debug panel shows sources |
| Scalability | Limited by context window | Unlimited with vector DB |

## License

This is an example application for learning purposes.
