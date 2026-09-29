# Secure DMS — Full VS Code Workspace

This folder combines the supplied **FastAPI backend** and **React/Vite frontend** into one clean workspace.

## Important status

- Backend: FastAPI + SQLAlchemy + JWT/RBAC + audit logging + SHA-256 + OCR service + blockchain service.
- Frontend: React + TypeScript + Vite + Tailwind + Recharts.
- The supplied frontend currently uses `mockData/localStorage` for most screens.
- Therefore, this archive is a **clean merged workspace**, not yet a fully wired frontend-to-backend production build.
- The next implementation step is replacing the mock API layer with the FastAPI API, then testing OCR and blockchain separately.

## Why the original frontend ZIP looked broken

The supplied archive contained empty literal directory names such as:

`src/{components/{layout,ui,...},pages/...}`

Those are not normal expanded folders. They were removed from this merged copy because they contain no application files.

---

# 1. Open in VS Code

Open the **`secure-dms-project`** folder in VS Code.

Recommended extensions:
- Python
- Pylance
- ESLint
- Tailwind CSS IntelliSense

---

# 2. Backend setup (VS Code)

Use VS Code's integrated terminal, not Windows Command Prompt.

Open a terminal and run:

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.local.example .env
```

If PowerShell blocks activation, you can still select the Python interpreter in VS Code:

**Ctrl+Shift+P → Python: Select Interpreter → backend\.venv\Scripts\python.exe**

The local `.env` uses SQLite to make the first run easy. PostgreSQL can be introduced after the application is working end-to-end.

---

# 3. Seed demo data

With the backend virtual environment selected:

```powershell
cd backend
python -m app.seed
```

The seed creates fictional demo users and cases.

Demo backend credentials:

| Role | Email | Password |
|---|---|---|
| Admin | admin@securedms.demo | DemoAdmin!2026 |
| Investigator | investigator@securedms.demo | DemoInvestigator!2026 |
| Reviewer | reviewer@securedms.demo | DemoReviewer!2026 |
| Viewer | viewer@securedms.demo | DemoViewer!2026 |

These are development/demo credentials only.

---

# 4. Run backend from VS Code

In VS Code:

**Run and Debug → create/select Python: FastAPI/Uvicorn configuration**

Or use the integrated VS Code terminal:

```powershell
cd backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Then open:

- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs

The backend health endpoint is:

`/health`

---

# 5. Frontend setup

Open a second VS Code terminal:

```powershell
cd frontend
npm install
```

Then create the local environment file:

```powershell
Copy-Item .env.example .env.local
```

The frontend API target should be:

`VITE_API_URL=http://127.0.0.1:8000`

Run:

```powershell
npm run dev
```

Open:

http://localhost:5173

---

# 6. Current integration gap

The frontend currently has:

`src/services/mockData.ts`

and most functions in:

`src/services/api.ts`

still read/write localStorage.

The backend already exposes real endpoints under:

`http://127.0.0.1:8000/api`

Examples:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard/stats`
- `GET /api/cases`
- `POST /api/cases`
- `GET /api/documents`
- `POST /api/documents/upload`
- `POST /api/documents/{id}/ocr`
- `POST /api/documents/{id}/verify`
- `POST /api/documents/{id}/blockchain/register`
- `GET /api/search?q=...`
- `GET /api/audit-logs`
- `GET /api/users`

So the correct next coding task is to make `frontend/src/services/api.ts` call these endpoints.

---

# 7. Recommended implementation order

Do NOT activate OCR, blockchain, PostgreSQL and frontend integration simultaneously.

Use this order:

### Phase A — Backend foundation
1. Start FastAPI.
2. Open `/docs`.
3. Seed users/cases.
4. Test login.
5. Test `/auth/me`.
6. Test case CRUD.
7. Test document upload.
8. Test document download.
9. Test SHA-256 integrity verification.
10. Test audit logs.

### Phase B — Frontend/API integration
Replace mock implementations in:

`frontend/src/services/api.ts`

with Axios calls to:

`VITE_API_URL + /api/...`

First wire:
1. Login
2. Session/JWT storage
3. `/auth/me`
4. Dashboard
5. Cases
6. Documents
7. Upload
8. Search
9. Audit
10. Users

### Phase C — Security
- JWT bearer token interceptor
- 401 handling
- RBAC matching backend roles
- Protected routes
- Admin-only pages/actions
- Audit events
- File validation
- Secure download endpoint

### Phase D — OCR
After upload works:
1. Upload document.
2. Store file.
3. Trigger OCR.
4. Save extracted text.
5. Display OCR result.
6. Handle OCR failure gracefully.

PaddleOCR should be installed/tested separately because its dependency footprint is much larger than the basic FastAPI application.

### Phase E — Blockchain
Only after hashing/integrity works:
1. Start local Ganache/private EVM.
2. Deploy `DocumentRegistry.sol`.
3. Put contract address in `.env`.
4. Enable blockchain.
5. Register SHA-256 hash.
6. Store transaction hash.
7. Verify on-chain registration.

### Phase F — End-to-end demo

The final demonstration flow should be:

Login → Create Case → Upload Document → SHA-256 Hash → OCR → Blockchain Registration → Verify Integrity → Tamper Test → Failed Verification → Restore/New Version → Audit Trail.

---

# 8. VS Code workflow

Keep one VS Code window open with two terminals:

**Terminal 1 — Backend**
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend**
```powershell
cd frontend
npm run dev
```

You do NOT need to use Windows Command Prompt separately.

For debugging, use:
- VS Code Run & Debug
- FastAPI Swagger at `/docs`
- Browser DevTools → Network
- VS Code Problems panel
- Python debugger
- ESLint/TypeScript diagnostics

---

# 9. Do not change everything at once

The safest milestone is:

**Backend login working + frontend login connected**

Then move to:

**Cases → Documents → Upload → OCR → Integrity → Blockchain**

This prevents one error from becoming a large debugging problem.

