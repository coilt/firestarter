/**
 * Editor → Penpot sync.
 *
 * For each save, we:
 *   1. Create a Penpot file on first sync (stores file ID in DB).
 *   2. Fetch the file to get the current revn and first page ID.
 *   3. Delete any frames we previously created (tagged by name prefix).
 *   4. Add one new frame per sheet with a title text object.
 *
 * The frame dimensions match the editor's sheet: 794 × 1122 (A4 at 96 dpi).
 * Frames are laid out horizontally with a 40px gap between them.
 */

import { randomUUID } from "crypto"
import { prisma } from "@/lib/db"
import {
  createFile,
  getFile,
  updateFile,
  ROOT_FRAME_ID,
  type ChangeOp,
} from "@/lib/penpot"

// ---------------------------------------------------------------------------
// Config guard
// ---------------------------------------------------------------------------

function isPenpotConfigured() {
  return !!(process.env.PENPOT_ACCESS_TOKEN && process.env.PENPOT_PROJECT_ID)
}

// ---------------------------------------------------------------------------
// TipTap JSON → sheet data
// ---------------------------------------------------------------------------

interface TipTapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
  text?: string
  marks?: Array<{ type: string }>
}

interface SheetData {
  index: number
  layoutId: string
  title: string   // first heading text, or "Untitled Sheet"
  body: string    // all paragraph text, newline-separated
}

/** Recursively collect all text leaves from a node. */
function extractText(node: TipTapNode): string {
  if (node.type === "text") return node.text ?? ""
  return (node.content ?? []).map(extractText).join("")
}

/** Walk the TipTap document JSON and return one SheetData per sheet node. */
export function extractSheets(doc: TipTapNode): SheetData[] {
  const sheets: SheetData[] = []

  for (const node of doc.content ?? []) {
    if (node.type !== "sheet") continue

    const index = (node.attrs?.index as number) ?? sheets.length
    const layoutId = (node.attrs?.layoutId as string) ?? "single-column"
    let title = ""
    const bodyLines: string[] = []

    for (const child of node.content ?? []) {
      if (child.type === "heading" && !title) {
        title = extractText(child).trim()
      } else {
        const text = extractText(child).trim()
        if (text) bodyLines.push(text)
      }
    }

    sheets.push({
      index,
      layoutId,
      title: title || `Sheet ${index + 1}`,
      body: bodyLines.join("\n"),
    })
  }

  return sheets
}

// ---------------------------------------------------------------------------
// Penpot change builders
// ---------------------------------------------------------------------------

const FRAME_WIDTH = 794
const FRAME_HEIGHT = 1122
const FRAME_GAP = 40
const FRAME_NAME_PREFIX = "fs-"   // "firestarter" prefix — used to identify our frames

/** Identity 2D transform matrix — required by Penpot's shape schema. */
const IDENTITY_MATRIX = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

/** Compute selrect + corner points for an axis-aligned rectangle. */
function shapeGeometry(x: number, y: number, w: number, h: number) {
  return {
    selrect: { x, y, width: w, height: h, x1: x, y1: y, x2: x + w, y2: y + h },
    points: [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    transform: IDENTITY_MATRIX,
    "transform-inverse": IDENTITY_MATRIX,
  }
}

function buildNewFrameChanges(pageId: string, sheets: SheetData[]): ChangeOp[]
function buildNewFrameChanges(pageId: string, sheet: SheetData): ChangeOp[]
function buildNewFrameChanges(pageId: string, sheetsOrSheet: SheetData | SheetData[]): ChangeOp[] {
  const sheets = Array.isArray(sheetsOrSheet) ? sheetsOrSheet : [sheetsOrSheet]
  return _buildFrameChanges(pageId, sheets)
}

function _buildFrameChanges(pageId: string, sheets: SheetData[]): ChangeOp[] {
  const changes: ChangeOp[] = []

  for (const sheet of sheets) {
    const frameId = randomUUID()
    const titleId = randomUUID()
    const x = sheet.index * (FRAME_WIDTH + FRAME_GAP)

    const textX = x + 40
    const textY = 60
    const textW = FRAME_WIDTH - 80
    const textH = 60

    // Frame object
    changes.push({
      type: "add-obj",
      id: frameId,
      "page-id": pageId,
      "parent-id": ROOT_FRAME_ID,
      "frame-id": ROOT_FRAME_ID,
      obj: {
        id: frameId,
        name: `${FRAME_NAME_PREFIX}${sheet.index}`,
        type: "frame",
        x,
        y: 0,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        "parent-id": ROOT_FRAME_ID,
        "frame-id": ROOT_FRAME_ID,
        fills: [{ "fill-color": "#FFFFFF", "fill-opacity": 1 }],
        strokes: [],
        shapes: [titleId],
        "clip-content": false,
        rotation: 0,
        ...shapeGeometry(x, 0, FRAME_WIDTH, FRAME_HEIGHT),
      },
    })

    // Title + body text object inside the frame
    changes.push({
      type: "add-obj",
      id: titleId,
      "page-id": pageId,
      "parent-id": frameId,
      "frame-id": frameId,
      obj: {
        id: titleId,
        name: "content",
        type: "text",
        x: textX,
        y: textY,
        width: textW,
        height: textH,
        "parent-id": frameId,
        "frame-id": frameId,
        "grow-type": "auto-height",
        rotation: 0,
        fills: [],
        strokes: [],
        content: buildTextContent(sheet.title, sheet.body),
        ...shapeGeometry(textX, textY, textW, textH),
      },
    })
  }

  return changes
}

/** Build a Penpot text content tree from title + body strings. */
function buildTextContent(title: string, body: string) {
  const paragraphs = []

  // Title paragraph
  paragraphs.push({
    type: "paragraph",
    fills: [],
    children: [
      {
        text: title,
        "font-size": "32",
        "font-weight": "700",
        "fill-color": "#111111",
        "fill-opacity": 1,
      },
    ],
  })

  // Body paragraphs
  if (body) {
    for (const line of body.split("\n")) {
      paragraphs.push({
        type: "paragraph",
        fills: [],
        children: [
          {
            text: line,
            "font-size": "16",
            "font-weight": "400",
            "fill-color": "#333333",
            "fill-opacity": 1,
          },
        ],
      })
    }
  }

  return {
    type: "root",
    children: [{ type: "paragraph-set", children: paragraphs }],
  }
}

/**
 * Build a minimal diff between current editor sheets and existing Penpot objects.
 *
 * Rules:
 *   - Frame exists for this sheet index → only update the "content" text object
 *     (preserves designer changes to layout, colours, position, etc.)
 *   - No frame yet → add frame + text (new sheet)
 *   - Frame exists but sheet was removed → delete the frame
 */
function buildSyncChanges(
  pageId: string,
  page: { id: string; objects: Record<string, { id: string; name?: string; type?: string; parentId?: string }> },
  sheets: SheetData[]
): ChangeOp[] {
  const changes: ChangeOp[] = []

  // Index our frames by sheet index
  const existingFrames = new Map<number, { id: string; name: string }>()
  for (const obj of Object.values(page.objects)) {
    if (obj.type === "frame" && obj.name?.startsWith(FRAME_NAME_PREFIX)) {
      const idx = parseInt(obj.name.slice(FRAME_NAME_PREFIX.length), 10)
      if (!isNaN(idx)) existingFrames.set(idx, obj as { id: string; name: string })
    }
  }

  const handledIndices = new Set<number>()

  for (const sheet of sheets) {
    const frame = existingFrames.get(sheet.index)

    if (frame) {
      // Frame already exists — find its "content" child and update only the text
      handledIndices.add(sheet.index)
      const contentObj = Object.values(page.objects).find(
        (o) => o.parentId === frame.id && o.name === "content"
      )
      if (contentObj) {
        changes.push({
          type: "mod-obj",
          id: contentObj.id,
          "page-id": pageId,
          operations: [
            { type: "set", attr: "content", val: buildTextContent(sheet.title, sheet.body) },
          ],
        })
      }
    } else {
      // New sheet — add frame + text
      changes.push(...buildNewFrameChanges(pageId, sheet))
    }
  }

  // Delete frames whose sheet no longer exists
  for (const [idx, frame] of existingFrames) {
    if (!handledIndices.has(idx)) {
      changes.push({ type: "del-obj", id: frame.id, "page-id": pageId })
    }
  }

  return changes
}

// ---------------------------------------------------------------------------
// Main sync entry point
// ---------------------------------------------------------------------------

interface SyncableDocument {
  id: string
  title: string
  content: unknown
  penpotFileId: string | null
}

/**
 * Sync a document to Penpot. Safe to call fire-and-forget.
 * Creates the Penpot file on first call and stores the ID in the DB.
 */
export async function syncToPenpot(doc: SyncableDocument): Promise<void> {
  if (!isPenpotConfigured()) return

  const projectId = process.env.PENPOT_PROJECT_ID!

  try {
    let fileId = doc.penpotFileId
    let revn: number
    let vern: number
    let pageId: string
    let existingPage: { id: string; objects: Record<string, { name?: string; type?: string }> } | null = null

    if (!fileId) {
      // First sync: create file — response already has revn + page ID
      const file = await createFile(projectId, doc.title)
      fileId = file.id
      revn = file.revn
      vern = file.vern ?? 0
      pageId = file.data.pages[0]
      await prisma.document.update({
        where: { id: doc.id },
        data: { penpotFileId: fileId },
      })
    } else {
      // Subsequent sync: fetch current state to get fresh revn + existing objects
      let file
      try {
        file = await getFile(fileId)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("404") || msg.includes("object-not-found")) {
          // Penpot file was deleted — reset and create fresh on next save
          await prisma.document.update({ where: { id: doc.id }, data: { penpotFileId: null } })
          console.warn("[penpot-sync] linked file not found, reset penpotFileId for document", doc.id)
          return
        }
        throw err
      }
      revn = file.revn
      vern = file.vern ?? 0
      pageId = file.data.pages[0]
      existingPage = file.data.pagesIndex[pageId] as typeof existingPage
    }

    const sessionId = randomUUID()
    const sheets = extractSheets(doc.content as TipTapNode)

    const changes = existingPage
      ? buildSyncChanges(pageId, existingPage, sheets)   // smart diff — preserves designer work
      : buildNewFrameChanges(pageId, sheets)             // first sync — add all frames fresh

    if (changes.length === 0) return

    await updateFile(fileId, revn, vern, sessionId, changes)
  } catch (err) {
    // Log but don't surface — sync failure must never break the save response
    console.error("[penpot-sync] failed:", err)
  }
}
