# Knowledge Graph Builder and Visualizer

## Stack

* **frontend**: React + Vite (graph editor, chat UI)
* **backend**: Node/Express (KG persistence, API)
* **llm**: FastAPI (PDF/text → nodes/edges, embeddings, doc Q\&A)
* **monitoring**: Prometheus + Grafana

## Quick start

```bash
# 1) root .env (same folder as docker-compose.yml)
MONGO_URI=mongodb://127.0.0.1:27017/db?retryWrites=true&w=majority
OPENAI_API_KEY=sk-xxx

# 2) up
docker compose up -d --build
```

## URLs

* App: [http://localhost:5173](http://localhost:5173)
* Backend API: [http://localhost:4000](http://localhost:4000)
* LLM API: [http://localhost:8000](http://localhost:8000)
* Prometheus: [http://localhost:9090](http://localhost:9090)
* Grafana: [http://localhost:3000](http://localhost:3000) (default: `admin` / `admin`)

*All services expose metrics at `/metrics` for Prometheus.*

## Dev (optional)

```bash
# frontend
cd frontend && npm i && npm run dev

# backend
cd backend && npm i && npm run dev

# llm
cd llm && pip install -r requirements.txt && uvicorn main:app --reload
```

## Folder layout

```
frontend/   # React app (graph, chat)
backend/    # Node/Express KG API & Mongo
llm/        # FastAPI extractor + QA
monitoring/ # Prometheus & Grafana config
```
