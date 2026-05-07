# AppGen — Config-Driven App Generator

A full-stack system that converts JSON configuration into fully working web applications.

## Architecture

```
appgen/
├── backend/          # Node.js + TypeScript + Express + PostgreSQL
│   └── src/
│       ├── config/   # Config validator & normalizer
│       ├── db/       # Database init & pool
│       ├── middleware/  # Auth, error handling
│       ├── routes/   # Auth, Apps, Dynamic CRUD, CSV, Notifications
│       └── services/ # Email, Notifications
└── frontend/         # Next.js 14 + React + Tailwind
    └── src/
        ├── app/      # Next.js App Router pages
        ├── components/
        │   ├── layout/   # AppShell, Providers
        │   └── runtime/  # Dynamic Table, Form, PageRenderer, ConfigEditor
        └── lib/      # API client, Auth context, Utils
```

## Features Implemented

1. **Dynamic Application Runtime** — JSON config → UI + APIs + DB automatically
2. **Config Normalization** — Handles incomplete, inconsistent, or partially wrong configs
3. **CSV Import/Export** — Upload CSV, map columns to entity fields, import data
4. **In-App Notifications** — Event-based notifications on record creation/update
5. **Email System** — Transactional emails (mock mode if SMTP not configured)
6. **Config Editor** — Monaco-based live JSON editor with validation
7. **Multi-template** — CRM, Task Manager, Inventory sample configs
8. **PWA Ready** — Manifest + responsive design
9. **Demo Login** — One-click demo account

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npm run dev
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit NEXT_PUBLIC_API_URL if backend is not on localhost:4000
npm run dev
```

### Database

Create a PostgreSQL database and set `DATABASE_URL` in backend `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/appgen
```

Tables are auto-created on first run.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| POST | /api/auth/demo | Demo login |
| GET | /api/apps | List user's apps |
| POST | /api/apps | Create app from config |
| GET | /api/apps/:id | Get app |
| PUT | /api/apps/:id | Update app config |
| DELETE | /api/apps/:id | Delete app |
| GET | /api/dynamic/:appId/:entity | List records |
| POST | /api/dynamic/:appId/:entity | Create record |
| PUT | /api/dynamic/:appId/:entity/:id | Update record |
| DELETE | /api/dynamic/:appId/:entity/:id | Delete record |
| POST | /api/csv/:appId/preview | Preview CSV |
| POST | /api/csv/:appId/:entity/import | Import CSV |
| GET | /api/csv/:appId/:entity/export | Export CSV |
| GET | /api/notifications | List notifications |

## Sample Config

```json
{
  "name": "CRM System",
  "entities": [
    {
      "name": "contacts",
      "label": "Contacts",
      "fields": [
        { "name": "name", "type": "string", "label": "Full Name", "required": true },
        { "name": "email", "type": "email", "label": "Email" },
        { "name": "status", "type": "select", "options": ["lead", "customer"], "default": "lead" }
      ]
    }
  ],
  "theme": { "primaryColor": "#6366f1" }
}
```

The system automatically:
- Generates CRUD UI for each entity
- Creates validation based on field types
- Handles missing/extra fields gracefully
- Auto-generates pages if none are defined

## Deployment

### Backend (Railway / Render / Fly.io)
```bash
cd backend
npm run build
npm start
```

### Frontend (Vercel / Netlify)
```bash
cd frontend
npm run build
npm start
```

Set environment variables in your hosting platform.

## Edge Cases Handled

- **Incomplete config** → normalized with defaults, warnings returned
- **Unknown field types** → fuzzy-matched to closest valid type
- **Missing entity in page config** → error state shown, app continues
- **Invalid JSON in editor** → error shown, save blocked
- **CSV column mismatch** → manual mapping UI
- **Auth token expired** → auto-redirect to login
- **Empty entities array** → auto-generated pages from entities
- **Bulk operations** → multi-select delete with confirmation
