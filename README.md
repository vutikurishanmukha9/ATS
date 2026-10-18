# Applicant Tracking System (ATS)

A production-ready applicant tracking and recruitment operations platform designed for modern hiring teams and engineering organizations. Features comprehensive pipeline management, automated resume screening with scoring, job requisitions with a public careers portal, keyboard-driven navigation, and an immutable stage audit trail.

---

## Core Capabilities

- **Pipeline Lifecycle Management**: Complete candidate journey across seven standardized stages: Applied, Screening, Interview, Technical, Offer, Hired, and Rejected. Includes business logic safeguards for terminal transitions and atomic bulk operations.
- **Dual-View Candidate Intelligence**:
  - Interactive Kanban board with drag-and-drop stage movement powered by keyboard-accessible workflows.
  - High-density tabular view with customizable compact and comfortable row density, multi-column sorting, pagination, and multi-candidate selection.
- **Automated Resume Screening**: Integrated evaluation engine that parses candidate qualifications, computes match scores against role requirements, and flags candidates meeting automated threshold criteria.
- **Job Requisitions & Public Careers Portal**: Full requisition management (creation, department tagging, custom passing thresholds) coupled with an external, responsive application portal for direct candidate submissions.
- **Global Command Palette**: Instant navigation and candidate search accessible anywhere via standard keyboard shortcuts (Cmd+K / Ctrl+K).
- **Comprehensive Audit Trail**: Every stage transition records an immutable audit log capturing timestamp, acting user, source stage, destination stage, and required transition rationale.

---

## Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.12)
- **Database Engine**: PostgreSQL with SQLAlchemy 2.0 (Async) and asyncpg driver
- **Search Capabilities**: PostgreSQL trigram similarity (`pg_trgm`) and full-text search vectors (`tsvector`)
- **Schema Management**: Alembic database migrations
- **Authentication & Security**: Argon2id password hashing and PyJWT token handling
- **Data Validation**: Pydantic v2 schemas
- **Testing**: Pytest asynchronous integration test suite

### Frontend
- **Framework**: React 19 with TypeScript and Vite
- **Styling**: Tailwind CSS
- **Data Tables**: TanStack Table v8
- **Drag-and-Drop**: @dnd-kit
- **Command Palette**: cmdk
- **Data Fetching**: TanStack React Query v5
- **Notification System**: Sonner

---

## Getting Started

### Prerequisites
- Python 3.12 or higher
- Node.js 20 or higher with npm
- PostgreSQL database (or local SQLite for lightweight development)

---

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # On macOS / Linux
   python -m venv .venv
   source .venv/bin/activate

   # On Windows (PowerShell)
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   ```

3. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Apply database migrations:
   ```bash
   alembic upgrade head
   ```

5. Initialize the primary administrator account:
   ```bash
   FIRST_USER_EMAIL=admin@example.com FIRST_USER_PASSWORD=ChangeThisSecurely123! python -m app.cli create-first-user
   ```

6. Start the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

   The API will be accessible at `http://127.0.0.1:8000`.
   - Health check: `http://127.0.0.1:8000/health`
   - Interactive API documentation: `http://127.0.0.1:8000/docs`

---

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

3. Launch the Vite development server:
   ```bash
   npm run dev
   ```

   The web interface will be accessible at `http://localhost:5173`.

---

## Configuration

Environment variables can be configured via a `.env` file in the project root or passed directly through your hosting platform.

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Asynchronous PostgreSQL connection string | `postgresql+asyncpg://<user>:<password>@<host>:<port>/<dbname>` |
| `SECRET_KEY` | Secret key used for signing JWT tokens | `<generate-a-32-character-random-secret>` |
| `ENVIRONMENT` | Application operating mode | `development` or `production` |
| `CORS_ORIGINS` | Permitted origins for cross-origin requests | `http://localhost:5173` |
| `COOKIE_SECURE` | Set secure flag on authentication cookies | `true` (in production) |
| `COOKIE_SAMESITE` | SameSite attribute for session cookies | `lax` |
| `FIRST_USER_EMAIL` | Initial administrator email for bootstrapping | `admin@example.com` |
| `FIRST_USER_PASSWORD` | Initial administrator password | `<secure-initial-password>` |
| `FIRST_USER_NAME` | Initial administrator display name | `System Administrator` |

---

## Testing & Quality Assurance

### Backend Automated Tests
Execute the asynchronous integration test suite:
```bash
cd backend
pytest -v
```

### Backend Code Formatting and Linting
```bash
cd backend
ruff check app tests
```

### Frontend Type-Checking and Production Build
```bash
cd frontend
npm run build
```

---

## Pipeline Governance Rules

1. **Terminal Stage Guard**: Moving a candidate out of a terminal stage (`hired` or `rejected`) mandates an explicit transition explanation to preserve hiring integrity.
2. **Duplicate Transition Prevention**: Attempting to move a candidate to their currently assigned stage is blocked with HTTP 422.
3. **Atomic Bulk Operations**: Multi-candidate stage updates execute within a single atomic database transaction. If any selected candidate violates business rules, the transaction rolls back completely.
4. **Duplicate Candidate Handling**: Submitting an application with an already registered email returns HTTP 409 and includes the existing candidate ID for direct profile inspection.
5. **Auditing**: Every status modification records an immutable log with the acting recruiter ID, timestamps, prior stage, new stage, and rationale.
