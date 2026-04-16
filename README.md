# Firestarter — Document Authoring Platform

A structured document authoring tool that decouples writing from design. Writers compose content in a Tiptap-based editor; designers consume and refine it in Figma — all synced through a shared database.

---

## How It Works

```
Writer (Tiptap editor)  ─────────────────┐
                                         ▼
                               Database (PostgreSQL)
                                         ▲
Designer (Figma plugin) ─────────────────┘
```

- Writers never open Figma.
- Designers never rewrite content — they apply layout, typography, and visual polish.
- Changes by either party sync back to the DB, which notifies the other side.

---

## Three-Layer Architecture

### 1. Editor (Tiptap / Next.js)
- Single ProseMirror instance with a custom `sheet` node.
- A document is a sequence of fixed-height sheets (A4 by default).
- Output is always structured JSON — no HTML serialisation hits the API.
- Writers choose a **document template** (e.g. *Scientific Report*, *Company Overview*) when creating a document. The template governs how many sheets there are and what layout each sheet uses.

### 2. Database (PostgreSQL + Prisma, hosted on AWS RDS / Aurora Serverless)
- Single source of truth for documents, sheets, templates, users, and sharing.
- Realtime change notifications via AWS AppSync subscriptions or API Gateway WebSockets.
- Amplify Auth (Cognito) handles identity — no separate auth service needed.

### 3. Figma Plugin
- Listens to DB via WebSocket / AppSync subscription.
- Maps each sheet's JSON content to a Figma frame using the sheet's `layoutId`.
- Designer edits text in Figma → plugin `PATCH`es the document → DB notifies Tiptap.

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
        "attrs": {
          "index": 0,
          "layoutId": "single-column"
        },
        "content": []
      },
      {
        "type": "sheet",
        "attrs": {
          "index": 1,
          "layoutId": "three-columns-table"
        },
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

DocumentShare
  documentId, userId, permission (view | edit)

DocumentTemplate
  id, name, description, defaultSheets (jsonb)
    └─ defaultSheets: array of { index, layoutId, label }

SheetLayout
  id, name, figmaComponentKey, columnCount, description
    └─ e.g. "single-column", "three-columns-table", "hero-image-left"
```

---

## Accounts & Collaboration (v1 scope)

- Every writer has an account and owns their own documents.
- Documents can be **shared** with specific users (view or edit permission).
- Shared documents appear in the recipient's dashboard alongside owned documents.
- Designers are also users; sharing a document with a designer allows them to edit via Figma.

---

## Templates & Per-Sheet Layouts (post-v1)

> These are not in v1 but the schema and JSON contract are designed to accommodate them from day one.

### Document Templates
A document template is a named preset that defines:
- How many sheets the document starts with.
- The default `layoutId` for each sheet.
- Any locked/non-editable structural sheets (e.g. a mandatory cover page).

Examples: *Scientific Report*, *Company Overview*, *Product Guide*, *Pitch Deck*.

### Per-Sheet Layout Selection
Within a document, a writer (or template) can assign a specific layout to each sheet:

| Layout ID | Description |
|---|---|
| `single-column` | Default — one text column |
| `two-columns` | Side-by-side columns |
| `three-columns-table` | Three text columns + a data table below |
| `hero-image-left` | Large image on the left, text on the right |
| `cover` | Full-bleed title sheet |

The `layoutId` on a sheet is the contract between the editor and the Figma plugin. The plugin maps it to a specific Figma component/frame key.

### Figma Mapping
Each `SheetLayout` record stores a `figmaComponentKey` — the Figma node ID or component key the plugin uses to instantiate the frame. When a designer publishes a new layout variant, a new `SheetLayout` row is inserted; the editor immediately offers it as an option.

---

## Realtime Sync Strategy

- **v1:** Short-poll on document `version` field (every 10 s) — simple, zero infrastructure overhead.
- **v2:** Upgrade to AppSync subscriptions or API Gateway WebSockets for sub-second updates.
- **Conflict resolution:** Last-write-wins on the full `content` blob (acceptable for early versions). Post-v1: optimistic locking via `version` counter; reject stale writes.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js + Tiptap | In use; structured JSON output |
| Styling | SCSS + CSS vars | In use |
| ORM | Prisma | Best DX on PostgreSQL; strong typing |
| Database | PostgreSQL (AWS RDS / Aurora Serverless) | Relational schema; stays in AWS |
| Auth | AWS Amplify Auth (Cognito) | Already in company AWS setup |
| Realtime | AWS AppSync or API GW WebSockets | Stays in AWS; AppSync subscriptions fit push pattern |
| Figma | Figma Plugin API | Fetch + postMessage to plugin UI |

---

## Dev Setup

This is a [Next.js](https://nextjs.org) project. Run the development server:

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
