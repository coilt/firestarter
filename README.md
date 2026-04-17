# Firestarter — Document Authoring Platform

**Think Google Slides, but the slides live in Penpot.**

A structured document authoring and design collaboration platform for organisations. Writers compose content in a Tiptap-based editor; designers apply layout, typography, and visual polish in Penpot — all synced bidirectionally through a shared database, with zero manual coordination required.

---

## Product Vision

- An **org-wide collaboration tool**: every user has a personal area (dashboard) showing documents they own or that have been shared with them.
- Writers pick a **Document Template** (e.g. *Scientific Report*, *Company Overview*) when starting a new document. The template defines how many pages the document has and what layout each page uses.
- Within a template, each page has a **layout** (`layoutId`) — this is the contract between the editor and Penpot.
- **Both sides are read/write for content**: text, images, charts, and graphs all sync in both directions.
- **Layer structure is locked**: frame positions and layout skeleton are set by designers and cannot be moved by writers. Writers work with content only; designers control both content and layout.
- **Zero manual coordination**: no plugin to keep open, no handoff step. Writer saves → Penpot updates. Designer edits → editor updates. It just works.

---

## Roles & Boundaries

| Action | Writer (Tiptap) | Designer (Penpot) |
|---|---|---|
| Edit text content | ✓ | ✓ |
| Upload images / charts / graphs | ✓ | — |
| Enhance / replace images | — | ✓ → syncs back to editor |
| Add / remove sheets | ✓ | — |
| Move / resize frames | ✗ locked | ✓ |
| Apply typography & colour | ✗ | ✓ |
| Choose sheet layout | ✓ (from template presets) | ✓ |

---

## How It Works

```
Writer (Tiptap editor)  ◄─────────────────────────┐
        │                                          │
        ▼                                          │
  Next.js API (saves doc + uploads assets)         │
        │                                          │
        ├──► Asset store (S3)              Penpot webhook
        │                               (text + asset changes)
        ▼                                          │
Database (PostgreSQL)                              │
        │                                          │
        ▼                                          │
  Penpot REST API ──── creates/updates ──────► Penpot file
                                                   │
                                      Designer edits text / layout /
                                      enhances or replaces images
```

- Writers never open Penpot.
- Writers upload raw images, charts, and graphs — designers enhance or replace them in Penpot, and the updated assets sync back to the editor.
- Designers can also edit text in Penpot — those changes sync back to the editor.
- Layer positions and frame structure are locked in Penpot — writers cannot break the layout.
- All sync is server-side and unattended.

---

## Why Penpot (not Figma)

Figma's REST API is read-only for file content — creating or modifying frames requires a plugin running inside an active Figma session. That means a human always has to have the app open to process sync events. This fundamentally breaks the zero-coordination model.

Penpot's REST API is fully writable server-side. Frames can be created, updated, and deleted by the Next.js backend with no one present. Penpot also emits webhooks on file changes, enabling the reverse direction (designer → editor) for both text and asset updates.

**Decision: Penpot for v1 and the foreseeable future.**

---

## Three-Layer Architecture

### 1. Editor (Tiptap / Next.js)
- Single ProseMirror instance with a custom `sheet` node.
- A document is a sequence of fixed-height sheets (A4 by default).
- Output is always structured JSON — no HTML serialisation hits the API.
- Writers choose a **Document Template** when creating a document. The template governs how many sheets there are and what layout each sheet uses.
- Writers upload images, charts, and graphs directly in the editor; these are stored in S3 and referenced by URL in the document JSON.

### 2. Database (PostgreSQL + Prisma) + Asset Store (S3)
- PostgreSQL is the single source of truth for documents, sheets, templates, users, and sharing.
- S3 (or compatible) stores binary assets — images, charts, graphs — referenced by URL in the document JSON.
- Hosted on AWS RDS / Aurora Serverless.
- Realtime change notifications via AWS AppSync subscriptions or API Gateway WebSockets (v2+).
- Amplify Auth (Cognito) handles identity (v2+).

### 3. Penpot (via REST API + Webhooks)
- On document save, the Next.js backend calls the Penpot REST API to create or update frames — no plugin, no open session required.
- Each sheet maps to a Penpot frame via `layoutId` → Penpot component key.
- Asset URLs from S3 are passed into Penpot frames as image fills or embedded references.
- Designer enhances or replaces an image in Penpot → Penpot fires a webhook → Next.js API retrieves the updated asset, uploads to S3, patches the DB → Tiptap session receives the update.
- Designer edits text → same webhook path → DB → Tiptap.
- Layer positions are locked in Penpot; only content fields (text, image references) are part of the bidirectional sync contract.

---

## Document & Sheet JSON Shape

```jsonc
{
  "id": "doc_abc123",
  "templateId": "scientific-report-v1",
  "title": "Q1 Research Summary",
  "version": 14,
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "sheet",
        "attrs": { "index": 0, "layoutId": "single-column" },
        "content": [
          { "type": "heading", "attrs": { "level": 1 }, "content": [{ "type": "text", "text": "Introduction" }] },
          { "type": "image", "attrs": { "src": "https://s3.../chart-q1.png", "alt": "Q1 chart" } }
        ]
      },
      {
        "type": "sheet",
        "attrs": { "index": 1, "layoutId": "three-columns-table" },
        "content": []
      }
    ]
  }
}
```

---

## Key Data Models (planned schema)

```
User
  id, email, role (writer | designer | admin)

Document
  id, title, templateId, ownerId, version, content (jsonb), updatedAt
  penpotFileId    ← ID of the mirrored Penpot file

DocumentShare
  documentId, userId, permission (view | edit)

DocumentTemplate
  id, name, description, defaultSheets (jsonb)
    └─ defaultSheets: array of { index, layoutId, label }

SheetLayout
  id, name, penpotComponentKey, columnCount, description
    └─ e.g. "single-column", "three-columns-table", "hero-image-left"
```

---

## Accounts & Collaboration (v2+ scope)

- Every writer has an account and owns their own documents.
- Documents can be **shared** with specific users (view or edit permission).
- Shared documents appear in the recipient's dashboard alongside owned documents.
- Designers are also users; sharing a document with a designer gives them access via Penpot.

---

## Templates & Per-Sheet Layouts

### Document Templates
A document template is a named preset that defines:
- How many sheets the document starts with.
- The default `layoutId` for each sheet.
- Any locked/non-editable structural sheets (e.g. a mandatory cover page).

Examples: *Scientific Report*, *Company Overview*, *Product Guide*, *Pitch Deck*.

### Per-Sheet Layout Selection

| Layout ID | Description |
|---|---|
| `single-column` | Default — one text column |
| `two-columns` | Side-by-side columns |
| `three-columns-table` | Three text columns + a data table below |
| `hero-image-left` | Large image on the left, text on the right |
| `cover` | Full-bleed title sheet |

The `layoutId` is the contract between the editor and Penpot. Each `SheetLayout` record stores a `penpotComponentKey` — the Penpot component the backend uses to instantiate the frame.

---

## URL Structure

Documents use a **stable shortId + decorative slug** pattern:

```
/documents/[slug]-[shortId]
```

- `shortId` — first 8 chars of the CUID. Never changes. This is what the server resolves.
- `slug` — generated from the document title. Updates on rename, but old links still resolve.

Example: `/documents/q1-research-summary-ck8x9p2f`

Moving or renaming a document never breaks the link.

### App Router file structure

```
app/
  page.tsx                         → redirect to /dashboard
  dashboard/
    page.tsx                       ← personal area (document list)
  documents/
    new/
      page.tsx                     ← template picker
    [docId]/
      page.tsx                     ← editor
      loading.tsx
      error.tsx
  api/
    documents/
      route.ts                     ← POST (create)
      [id]/
        route.ts                   ← GET, PATCH, DELETE
    upload/
      route.ts                     ← image → S3
    penpot/
      webhook/
        route.ts                   ← Penpot → DB → Tiptap
```

---

## Document Storage Format

Documents are stored as **ProseMirror JSON** (`content jsonb` in Postgres).

**Rationale:** JSON is the authoritative, lossless representation of the Tiptap document state. It is still a text format — any external tool (Obsidian plugin, CLI script, etc.) can parse it directly without risk of data loss. Markdown storage was considered and rejected because parsing on load introduces failure modes and ~15% formatting loss with no compensating benefit — JSON is equally portable as a structured text format.

If an Obsidian plugin or other reader is ever needed, it reads the JSON directly. No app changes required.

---

## Versioning & Milestones

### v1 — Proof of Concept
**Goal:** Writer creates a document (with text and at least one image) → saved to DB + S3 → corresponding Penpot frames created automatically → designer opens Penpot and sees the content. Zero manual coordination.

Scope:
- [ ] Document save/load wired to DB
- [ ] Image upload to S3, URL stored in document JSON
- [ ] One predefined template with `single-column` layout
- [ ] On save, Next.js calls Penpot REST API to create/update frames with text and images
- [ ] Designer opens Penpot and sees content without any manual setup

Everything else (auth, sharing, real-time two-way sync, asset replacement webhook, multi-template) is post-v1.

### v2 — Bidirectional Sync + Auth
- Penpot webhook → DB → Tiptap: designer text edits and image replacements flow back to the editor
- Updated assets retrieved from Penpot, uploaded to S3, URL patched in DB
- AWS Cognito auth, personal dashboard
- Optimistic locking via `version` counter

### v3 — Full Org Product
- Multiple templates, per-sheet layout switching in the editor
- Document sharing and permissions
- Template management UI for admins
- Real-time collaboration (AppSync / WebSockets)

---

## Realtime Sync Strategy

- **v1:** Explicit save; Penpot frames created synchronously on save via REST API.
- **v2:** Penpot webhooks for designer→editor direction (text + asset changes); WebSocket or poll for editor→designer.
- **v3:** Full duplex real-time via AppSync subscriptions or API Gateway WebSockets.
- **Conflict resolution:** Last-write-wins on full `content` blob (v1–v2). Post-v2: optimistic locking via `version` counter; reject stale writes.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js + Tiptap | In use; structured JSON output |
| Styling | SCSS + Tailwind CSS | In use |
| ORM | Prisma | Best DX on PostgreSQL; strong typing |
| Database | PostgreSQL (AWS RDS / Aurora Serverless) | Relational schema; stays in AWS |
| Asset storage | AWS S3 | Binary assets (images, charts, graphs) |
| Auth | AWS Amplify Auth (Cognito) | Already in company AWS setup (v2+) |
| Realtime | AWS AppSync or API GW WebSockets | Stays in AWS (v2+) |
| Design tool | **Penpot REST API + Webhooks** | Only option supporting unattended server-side frame generation and asset sync |

---

## Dev Setup

```bash
pnpm install
pnpm dev
```

Requires a PostgreSQL instance. Copy `.env.example` to `.env` and set `DATABASE_URL`.

```bash
pnpm prisma:migrate:dev
pnpm prisma:generate
```

Docker Compose is available for local Postgres:

```bash
docker compose up -d
```
