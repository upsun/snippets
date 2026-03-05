# Upsun Documentation Chatbot

An AI-powered chatbot that helps users navigate and understand the Upsun documentation. Built with Node.js, LangChain, OpenAI, and nlux for the frontend.

## Features

- **LangChain integration** with OpenAI for natural language understanding
- **Context-aware responses** using the entire Upsun documentation as context
- **Security hardening** with prompt injection detection, output filtering, and datamarking
- **Rate limiting** to prevent abuse
- **Clean UI** powered by nlux with conversation history
- **Streaming responses** for real-time interaction

## Architecture

- **Backend**: Express.js server with TypeScript
- **LLM**: OpenAI GPT-4o-mini (configurable) via LangChain
- **Frontend**: nlux chat interface served as static HTML
- **Context**: Markdown documentation from platformsh-docs repository, processed into a single text file
- **Deployment**: Configured for Upsun with build-time documentation cloning

## Local development

### Prerequisites

- Node.js 22+
- pnpm (or use corepack)
- OpenAI API key

### Setup

1. Install dependencies:

```bash
pnpm install
```

2. Clone the Upsun documentation:

```bash
git clone --depth 1 --single-branch --branch main \
  https://github.com/platformsh/platformsh-docs.git docs
```

3. Build the context file from documentation:

```bash
pnpm build:context
```

4. Create `.env` file:

```bash
cp .env.example .env
```

5. Add your OpenAI API key to `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
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
git commit -m "Initial Upsun chatbot"
upsun push
```

The build process will:
1. Install dependencies with pnpm
2. Clone the Upsun documentation repository
3. Build the context file from markdown sources
4. Compile TypeScript to JavaScript
5. Start the server

## Project structure

```
01-langchain-chatbot/
├── src/
│   ├── index.ts           # Express server and API routes
│   ├── chat.ts            # LangChain chat logic with security hardening
│   ├── context.ts         # Context loading from filesystem
│   ├── validation.ts      # Input validation and injection detection
│   ├── rate-limiter.ts    # Rate limiting middleware
│   └── filters.ts         # Output filtering and leakage detection
├── scripts/
│   └── build-context.ts   # Build script to process docs into context.txt
├── public/
│   └── index.html         # nlux chat UI
├── .upsun/
│   └── config.yaml        # Upsun deployment configuration
├── package.json
├── tsconfig.json
├── biome.json            # Linting and formatting config
└── README.md
```

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
- `CONTEXT_PATH` (optional): Path to context file (default: `./context.txt`)

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

## How it works

1. **Build time**: The Upsun documentation is cloned and all markdown files are processed into a single `context.txt` file with file paths and URLs
2. **Startup**: The server loads `context.txt` into memory as the knowledge base
3. **User query**: When a user asks a question, the entire context is included in the system prompt
4. **LLM processing**: LangChain sends the conversation to OpenAI with security hardening
5. **Streaming response**: The response is streamed back to the frontend in real-time
6. **History**: Conversation history is maintained in the browser's sessionStorage

## Limitations

- Context is loaded statically at startup (no dynamic updates)
- All documentation is stuffed into the prompt (no vector search or RAG)
- Suitable for demonstration purposes, not production-scale applications

## Future enhancements

For a production-ready version, consider:

- Vector database (Qdrant, Pinecone) for semantic search
- Chunking and embedding documents for better retrieval
- Dynamic context refresh
- User authentication
- Analytics and feedback collection
- Multi-language support

## License

This is an example application for learning purposes.
