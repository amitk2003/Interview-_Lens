# InterviewLens

A technical interview evaluation platform that combines automated transcript analysis with verified human expert review to produce accurate, auditable hiring reports.

---

## What is InterviewLens?

Most automated interview tools generate scores using single AI prompts that can misinterpret answers or invent feedback. InterviewLens solves this by pairing automated transcript evaluation with a **human-in-the-loop review workflow**:

1. **Transcript Ingestion**: The system parses interview transcripts from Google Meet, Zoom, MS Teams, or text/audio uploads.
2. **Automated Analysis**: The backend evaluates technical knowledge, problem-solving, communication clarity, and behavioral structure with timestamped transcript citations.
3. **Evidence Verification**: Claims are checked against verbatim transcript text. Statements not spoken by the candidate are removed.
4. **Human Expert Calibration**: A verified industry expert reviews the evidence, adjusts scores with written justification, and finalizes the assessment.
5. **Auditable Report**: The candidate receives a finalized evaluation report. An append-only audit log records every score change and administrative action.

---

## Live Deployments

* **Frontend**: [https://interview-lens-brown.vercel.app/](https://interview-lens-brown.vercel.app/) (Vercel)
* **Backend API**: [https://interview-lens-2qgc.onrender.com/api/health](https://interview-lens-2qgc.onrender.com/api/health) (Render)

---

## System Architecture

The project is structured as a decoupled full-stack application:

```
[ Candidate / Expert / Admin ]
              │
              ▼
   ┌─────────────────────┐
   │   React 18 + Vite   │  (Hosted on Vercel)
   │  Responsive Client  │
   └──────────┬──────────┘
              │ HTTPS / REST (Bearer Token)
              ▼
   ┌─────────────────────┐
   │   FastAPI Backend   │  (Hosted on Render)
   │   Python 3.12       │
   ├─────────────────────┤
   │ • Auth & RBAC Guard │  (Candidate, Pending Expert, Expert, Admin)
   │ • Rate Limiter      │  (Sliding-window request limits)
   │ • Transcript Parser │  (Extracts speaker tags and timestamps)
   │ • Scoring Pipeline  │  (Groq Llama 3.3 70B / OpenAI fallback)
   │ • Audit Logger      │  (Append-only, redacts passwords & tokens)
   └──────────┬──────────┘
              │
      ┌───────┴───────┐
      ▼               ▼
┌──────────────┐  ┌─────────────────────┐
│ MongoDB Atlas│  │ Local JSON Fallback │
│  (Database)  │  │ (Zero-config local) │
└──────────────┘  └─────────────────────┘
```

---

## Core Workflow

```
1. Candidate completes interview & uploads transcript
                 │
                 ▼
2. Backend parses transcript & runs initial analysis
   (Generates 7 dimension scores + timestamped citations)
                 │
                 ▼
3. Verification logic checks quotes against transcript
   (Ungrounded claims are filtered out)
                 │
                 ▼
4. Assessment enters Expert Queue
                 │
                 ▼
5. Admin verifies an expert & assigns them to the assessment
                 │
                 ▼
6. Assigned Expert inspects transcript quotes & adjusts scores
                 │
                 ▼
7. Expert finalizes review & Admin releases report
                 │
                 ▼
8. Candidate views final report | Audit log records all events
```

---

## User Roles & Permissions

| Role | Access Level |
|---|---|
| **Candidate** | Can upload transcripts, view personal assessments, and request expert reviews on their own interviews. |
| **Pending Expert** | An expert applicant awaiting administrator review. Cannot view the queue or score candidates. |
| **Verified Expert** | Approved by an administrator. Can claim unassigned assessments, inspect evidence, and submit score calibrations. Cannot review their own assessments (conflict-of-interest check). |
| **Administrator** | Verifies expert credentials, assigns evaluators, releases final reports, and inspects immutable audit logs. |

---

## Security & Reliability Features

* **Server-Side Authorization (RBAC)**: All permissions are enforced in Python backend endpoints, not just in frontend UI components.
* **Resource Ownership Checks (IDOR Protection)**: Candidates can only access their own assessments and transcripts.
* **Conflict of Interest Prevention**: Experts cannot claim or evaluate assessments where they are the candidate.
* **State Machine Protection**: Candidates and unverified experts cannot force status changes (e.g., jumping directly to `FINALIZED`).
* **Append-Only Audit Trail**: Every assignment, score change, and publication writes an immutable audit record with passwords and auth tokens automatically redacted (`[REDACTED]`).
* **Rate Limiting**: Sliding-window rate limiters prevent brute-force attacks on login and spam submissions.

---

## Tech Stack

* **Frontend**: React 18, Vite, Lucide Icons, Vanilla CSS
* **Backend**: FastAPI, Python 3.12, Uvicorn, Gunicorn, Pydantic v2
* **Database**: MongoDB Atlas (`pymongo`) with local JSON flat-file fallback
* **LLM Engine**: Groq (`llama-3.3-70b-versatile`) with OpenAI fallback and offline heuristic mode
* **Testing**: Pytest, Pytest-Asyncio, HTTP integration test runner

---

## Getting Started Locally

### 1. Prerequisites
* Python 3.10+
* Node.js 18+ (optional, pre-built frontend bundle included in `frontend/dist`)

### 2. Configure Environment (`.env`)
Create a `.env` file in the project root:

```env
# LLM Provider (Free key at console.groq.com)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Optional Fallback
OPENAI_API_KEY=

# Database (Leave blank to use local file fallback)
MONGODB_URI=
MONGODB_DB_NAME=InterviewPostmartem

# Server Port
BACKEND_PORT=8000
```

> **Note**: If `GROQ_API_KEY` is not provided, the platform automatically runs on a built-in deterministic heuristic engine so all features work offline.

### 3. Install Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### 4. Run the Application
```bash
python start_app.py
```
Open **`http://localhost:8000`** in your browser.

### 5. (Optional) Run with Docker
```bash
docker compose up --build
```

---

## Running Automated Tests

Run the full automated test suite (51 unit and integration tests):

```bash
python -m pytest tests/ -v
```

Run the live end-to-end workflow test against the deployed Render backend:

```bash
python scratch/test_e2e_full_verification.py
```

---

## Project Structure

```
Interviewlens/
├── backend/
│   ├── main.py                     # FastAPI REST API, auth routes & SPA server
│   ├── requirements.txt            # Python dependencies
│   ├── models/
│   │   └── schemas.py              # Pydantic data schemas
│   ├── services/
│   │   ├── auth_service.py         # Authentication & RBAC logic
│   │   ├── assignment_service.py   # Expert-to-interview assignment logic
│   │   ├── audit_service.py        # Append-only security audit logger
│   │   ├── lifecycle_service.py    # Assessment state machine
│   │   ├── storage.py              # In-memory and file storage layer
│   │   ├── mongodb.py              # MongoDB Atlas connection manager
│   │   ├── rate_limiter.py         # Sliding-window rate limiter
│   │   └── llm_client.py           # Groq and OpenAI API client
│   └── agents/
│       ├── orchestrator.py         # Pipeline coordinator
│       ├── technical_agent.py      # Technical depth evaluation
│       ├── communication_agent.py  # Speaking pace & structure evaluation
│       ├── behavioral_agent.py     # STAR method & ownership evaluation
│       └── verification_agent.py   # Transcript quote ground-truth checker
├── frontend/
│   ├── src/
│   │   ├── components/             # React views (Candidate, Expert, Admin)
│   │   ├── App.jsx                 # Main application component
│   │   └── index.css               # Design system & styles
│   ├── dist/                       # Pre-built production frontend
│   └── package.json
├── tests/                          # 51 automated pytest test suites
├── Dockerfile                      # Production container definition
├── docker-compose.yml              # Local container orchestrator
├── start_app.py                    # Single-command app launcher
└── README.md
```

---

## License

This project is licensed under the MIT License.
