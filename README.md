# SecureDMS — Secure Digital Document Management System

A complete, professional frontend for legal and investigation document management, built with React + Vite + TypeScript + Tailwind CSS.

---

## Quick Start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@securedms.demo | admin123 |
| Investigator | investigator@securedms.demo | investigator123 |
| Reviewer | reviewer@securedms.demo | reviewer123 |
| Viewer | viewer@securedms.demo | viewer123 |

> **Tip:** Click a role card on the login page to auto-fill credentials.

---

## Demo Workflow (Central Demonstration)

1. **Login** as Investigator
2. Go to **Dashboard** — view KPI cards and charts
3. Navigate to **Cases** → Create a new case
4. Go to **Documents → Upload Document**
   - Select a file (or any `.pdf`/`.jpg`/`.docx`)
   - Pick the case you just created
   - Choose Document Type: `FIR`
   - Click **Upload & Secure Document**
   - Watch the live pipeline: Upload → OCR → SHA-256 → Blockchain
5. Click **View Document Details** on the success screen
6. In Document Details, click **Verify Integrity** → **✓ DOCUMENT VERIFIED**
7. In the **Document Integrity** page:
   - Click **Simulate Tampering** → hash changes
   - Click **Verify Document Integrity** → **⚠ INTEGRITY VERIFICATION FAILED**
   - Click **Restore** to bring it back
8. Open **Activity History** — see every event logged
9. Open **Version History** — browse the document's version timeline
10. Use **Search** — type `FIR` or the case number to find the document

---

## Architecture

```
src/
├── components/
│   ├── layout/         # Sidebar, Topbar, AppLayout
│   └── ui/             # Badge, Primitives, Modal, Pagination, States
├── context/            # AuthContext, ToastContext
├── pages/              # One folder per page/feature
├── routes/             # Route guards (ProtectedRoute, PermissionRoute)
├── services/
│   ├── api.ts          # Centralized API layer (mock → FastAPI ready)
│   ├── auth.ts         # Authentication service
│   └── mockData.ts     # Seed data + localStorage store
├── types/              # Shared TypeScript types
└── utils/
    ├── format.ts       # Date, hash, ID helpers
    └── permissions.ts  # Role → permission matrix
```

### Connecting the FastAPI Backend

Every function in `src/services/api.ts` is written to look like a real async API call.
To connect:

1. Set `VITE_API_URL=http://localhost:8000` in `.env.local`
2. Add an Axios instance at the top of `api.ts`:
   ```ts
   const http = axios.create({ baseURL: import.meta.env.VITE_API_URL });
   ```
3. Replace each function body with its HTTP call, e.g.:
   ```ts
   export async function getCases() {
     const { data } = await http.get<Case[]>('/api/cases');
     return data;
   }
   ```
4. The UI doesn't change — all page components import only from `services/api.ts`.

### Role-Based Access Control

Permission rules live in `src/utils/permissions.ts`. The same matrix will be
enforced by the FastAPI backend using dependency injection on each route.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 3 |
| Routing | React Router v6 |
| HTTP client | Axios (ready, not yet wired) |
| Charts | Recharts |
| Icons | Lucide React |
| State | React Context + localStorage |

---

## Backend Plan (not yet connected)

- **API:** Python FastAPI
- **Database:** PostgreSQL
- **OCR:** PaddleOCR
- **Hashing:** SHA-256 (hashlib)
- **Blockchain:** Solidity smart contracts + Ganache (local/private chain)

---

## Notes

- All blockchain references in this demo are **mock** — hashes are generated locally
  and no real transaction is written to any chain.
- The label **"Demo / Mock Blockchain"** appears throughout to make this clear.
- No real personal or case data is used — all names, stations, and case numbers
  are fictional.
