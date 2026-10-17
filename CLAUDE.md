# 🔍 CLAUDE.md — InterviewLens Developer & Agent Guide

> **Project:** InterviewLens — Multi-Agent Evidence-Grounded Interview Intelligence Platform  
> **Built for:** micro1 Agentic Workflows Hackathon  
> **AI Pairing Engines:** Anthropic Claude (Claude Code / Opus) & Google Gemini (Antigravity)

---

## 📌 Project Overview

**InterviewLens** is an end-to-end interview intelligence platform that ingests real interview transcripts (from Otter.ai, Google Meet, Zoom, MS Teams, or built-in Live AI practice), processes them through a **7-Layer Multi-Agent Pipeline**, fact-checks all feedback against verbatim transcript timestamps, and differentiates **Knowledge Gaps** from **Performance Gaps** through an interactive diagnostic re-test engine.

---

## 🛠️ Quick Commands & Development

### 1. Backend (FastAPI + Python)
```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment (Windows PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start development server with auto-reload (port 8000)
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server (port 5173 with proxy to backend)
npm run dev

# Build production bundle (outputs to frontend/dist)
npm run build
```

### 3. Full App Single-Command Launch (Root)
```bash
# Starts backend and serves production frontend bundle
python start_app.py
```

### 4. Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build -d
```

---

## 🏗️ Architecture & Multi-Agent Pipeline

The core product philosophy is **Evidence Grounding**: No AI assessment is presented to the user without a verified transcript quote and exact timestamp `[MM:SS]`.

```
                        TRANSCRIPT INGESTION
        (Otter.ai .txt/.srt/.vtt, Meet, Zoom, Teams, Live AI)
                                 │
                                 ▼
                     Transcript Normalizer
            [{speaker, timestamp, text, is_question}]
                                 │
                                 ▼
                    Interview Orchestrator
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
 🔧 Technical Agent    🗣️ Communication Agent   🧠 Behavioral Agent (STAR)
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                                 ▼
                  ✅ Evidence Verification Agent
         (Accepts, Modifies, or Rejects ungrounded claims)
                                 │
                                 ▼
                   📊 Calibrated Assessment
                                 │
                                 ▼
                   🧠 Longitudinal Memory
                                 │
                                 ▼
                  📈 Cross-Interview Agent
         (Recurring weaknesses & customized prep roadmap)
                                 │
                                 ▼
         🧪 Knowledge vs. Performance Gap Re-Test Engine
                                 │
                                 ▼
                 🍃 MongoDB Atlas / Cloud Persistence
```

### Specialized Agents Directory (`backend/agents/`)
| Agent File | Role | Primary Output |
| :--- | :--- | :--- |
| `orchestrator.py` | Coordinates parallel analysis runs via `asyncio.gather` | Unified interview evaluation payload |
| `technical_agent.py` | Assesses conceptual depth, system design, algorithm trade-offs | Technical score (0–10), struggle topics |
| `communication_agent.py` | Extracts observable metrics (filler words, pauses, clarification asks) | Fluency metrics & conversational balance |
| `behavioral_agent.py` | Evaluates STAR structure (Situation, Task, Action, Result) & ownership | STAR % coverage, "I" vs "We" ratio |
| `verification_agent.py` | Validates every critique against raw transcript timestamps | Verified Grounding %, filtered claims |
| `cross_interview_agent.py` | Analyzes historical sessions across time | Trajectory trends & tailored study roadmap |

---

## 🔑 Key Codebase Conventions & Standards

### Python & Backend Conventions
1. **Async by Default:** All agent executions, LLM calls, and database operations must be asynchronous (`async def`, `asyncio.gather`, Motor async MongoDB client).
2. **Strict Pydantic Schemas:** All agent outputs must adhere strictly to Pydantic models defined in `backend/models/`. System prompts should enforce JSON schema compliance.
3. **Dual-Engine LLM Resilience:** 
   - Primary: Groq (`llama-3.3-70b-versatile`) / OpenAI (`gpt-4o`) / Gemini.
   - Fallback: Deterministic heuristic simulation generator in `backend/services/` to guarantee zero-crash demos even when API rate limits hit.
4. **Data Isolation:** Every interview and session is strictly scoped by `user_email` to prevent cross-tenant data leakage.

### Frontend Conventions
1. **Glassmorphism UI:** Modern dark theme styling with frosted glass cards, subtle borders (`border-white/10`), vibrant accent gradients (violet, indigo, emerald), and responsive layouts.
2. **Lucide React Icons:** Use `lucide-react` for all iconography.
3. **Component Reusability:** Keep components modular under `frontend/src/components/` (e.g., `TranscriptScrubber`, `AgentInspectionPanel`, `DiagnosticQuizModal`).

---

## 🔐 Environment Variables (`.env`)

```env
# Server Configuration
PORT=8000
ENVIRONMENT=development

# LLM Providers
GROQ_API_KEY=your_groq_api_key
OPENAI_API_KEY=your_openai_api_key

# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/interviewlens?retryWrites=true&w=majority
MONGODB_DB_NAME=interviewlens

# Client URL (for CORS)
CORS_ORIGINS=http://localhost:5173,http://localhost:8000
```

---

## 🤖 Claude Code & Gemini Pairing Workflow

When modifying or extending this repository:
1. **Zero Hallucination:** Ensure any new agent or feature adheres to the transcript-grounding requirement.
2. **Verification Agent First:** If adding new evaluation metrics, register validation logic in `verification_agent.py`.
3. **Keep Tests & Docs Updated:** Reflect changes in `README.md`, `Walkthrough.md`, and system diagrams.
