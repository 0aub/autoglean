# autoglean

AutoGlean is a document information extraction system powered by multimodal LLMs. It provides a flexible framework for extracting structured data from documents using vision-capable language models.

## Features

- **Multimodal Document Extraction**: Extract information from PDFs and images using vision-capable LLMs
- **Flexible Extractors**: Configure custom extraction recipes with YAML
- **Multiple LLM Support**: Works with Gemini, OpenAI, Anthropic, and other providers via LiteLLM
- **Async Processing**: Background task processing with Celery and Redis
- **Web UI**: React-based interface for easy document processing
- **Rate Limiting**: Built-in rate limiting to stay within API quotas
- **Image Optimization**: Automatic image optimization to reduce token usage

## Architecture

- **Backend**: FastAPI + Celery + Redis
- **Frontend**: React + TypeScript + Vite
- **LLM Integration**: LiteLLM for unified API access
- **Containerization**: Docker Compose for easy deployment

## Quick Start

1. Copy `.env.example` to `.env` and configure your API keys
2. Run `docker-compose up` to start all services
3. Access the UI at `http://localhost:3001`

## Configuration

Extractors are configured in `config/extractors.yaml`. Each extractor defines:
- LLM model to use
- Extraction prompt
- Output format (JSON, Markdown, etc.)
- Temperature and token limits

## License

MIT
