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
  type PenpotComponent,
  type PenpotObject,
  type PenpotPage,
} from "@/lib/penpot"

// ---------------------------------------------------------------------------
// Config guard
// ---------------------------------------------------------------------------

function isPenpotConfigured() {
  return !!(process.env.PENPOT_ACCESS_TOKEN && process.env.PENPOT_PROJECT_ID)
}

// ---------------------------------------------------------------------------
// Library file cache (5-minute TTL — avoids re-fetching on every save)
// ---------------------------------------------------------------------------

interface LibData {
  fileId: string
  components: Record<string, PenpotComponent>
  pagesIndex: Record<string, PenpotPage>
}

let _libCache: { data: LibData; ts: number } | null = null
const LIB_CACHE_TTL_MS = 5 * 60 * 1000

async function getLibraryData(): Promise<LibData | null> {
  const fileId = process.env.PENPOT_LIBRARY_FILE_ID
  if (!fileId) return null

  const now = Date.now()
  if (_libCache && now - _libCache.ts < LIB_CACHE_TTL_MS) return _libCache.data

  try {
    const file = await getFile(fileId)
    const data: LibData = {
      fileId: file.id,
      components: file.data.components ?? {},
      pagesIndex: file.data.pagesIndex,
    }
    _libCache = { data, ts: now }
    return data
  } catch (err) {
    console.error("[penpot-sync] failed to fetch library file:", err)
    return null
  }
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

interface TemplateBlockData {
  componentId: string
  componentPath: string
  componentName: string
  title: string   // first heading inside the block
  body: string    // remaining text
}

interface SheetData {
  index: number
  layoutId: string
  title: string   // first heading text, or "Untitled Sheet"
  body: string    // all paragraph text, newline-separated
  blocks: TemplateBlockData[]
}

/** Recursively collect all text leaves from a node. */
function extractText(node: TipTapNode): string {
  if (node.type === "text") return node.text ?? ""
  return (node.content ?? []).map(extractText).join("")
}

/** Extract title + body text from a node's children (heading first, rest body). */
function extractTitleBody(node: TipTapNode): { title: string; body: string } {
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
  return { title, body: bodyLines.join("\n") }
}

/** Walk the TipTap document JSON and return one SheetData per sheet node. */
export function extractSheets(doc: TipTapNode): SheetData[] {
  const sheets: SheetData[] = []

  for (const node of doc.content ?? []) {
    if (node.type !== "sheet") continue

    const index = (node.attrs?.index as number) ?? sheets.length
    const layoutId = (node.attrs?.layoutId as string) ?? "single-column"
    const blocks: TemplateBlockData[] = []

    let title = ""
    const bodyLines: string[] = []

    for (const child of node.content ?? []) {
      if (child.type === "templateBlock") {
        const { title: bTitle, body: bBody } = extractTitleBody(child)
        blocks.push({
          componentId: (child.attrs?.componentId as string) ?? "",
          componentPath: (child.attrs?.componentPath as string) ?? "",
          componentName: (child.attrs?.componentName as string) ?? "",
          title: bTitle,
          body: bBody,
        })
      } else if (child.type === "heading" && !title) {
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
      blocks,
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
const BLOCK_NAME_PREFIX = "fsblk:" // prefix for component instance frames inside a sheet frame

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

/** Build a minimal text content with a single paragraph for slot overrides. */
function buildSlotTextContent(text: string) {
  return {
    type: "root",
    children: [
      {
        type: "paragraph-set",
        children: [
          {
            type: "paragraph",
            fills: [],
            children: [{ text }],
          },
        ],
      },
    ],
  }
}

// ---------------------------------------------------------------------------
// Component instance builder
// ---------------------------------------------------------------------------

/**
 * Clone a component from the library file into a new location on the canvas.
 *
 * - Sets `component-id` + `component-file` on the root instance frame
 * - Sets `shape-ref` on every cloned shape pointing to the original library shape
 * - Remaps all internal IDs so children reference the new UUIDs
 * - Overrides text content for any shape whose name starts with "fs:" using slotValues
 *
 * Returns the `add-obj` changes and the height of the root instance frame
 * (so callers can stack the next block below it).
 */
function buildComponentInstance(
  pageId: string,
  parentFrameId: string,
  placeX: number,
  placeY: number,
  block: TemplateBlockData,
  blockIdx: number,
  lib: LibData,
  /** Pre-generated UUID for the instance root — lets callers include it in parent shapes[]. */
  instanceId?: string,
): { changes: ChangeOp[]; height: number } {
  const componentId = block.componentId
  if (!componentId) return { changes: [], height: 0 }

  // Look up the component definition to get the main instance location
  const component = lib.components[componentId]
  if (!component) {
    console.warn(`[penpot-sync] component ${componentId} not found in library`)
    return { changes: [], height: 0 }
  }

  const rootId = component.mainInstanceId
  const libPageId = component.mainInstancePage
  if (!rootId || !libPageId) {
    console.warn(`[penpot-sync] component ${componentId} has no mainInstanceId/mainInstancePage`)
    return { changes: [], height: 0 }
  }

  const libPageObjects = lib.pagesIndex[libPageId]?.objects
  if (!libPageObjects) {
    console.warn(`[penpot-sync] library page ${libPageId} not found`)
    return { changes: [], height: 0 }
  }

  const root = libPageObjects[rootId]
  if (!root) return { changes: [], height: 0 }

  // BFS: collect all shapes that belong to this component instance
  const childrenMap = new Map<string, string[]>()
  for (const obj of Object.values(libPageObjects)) {
    const pid = obj.parentId
    if (pid) {
      if (!childrenMap.has(pid)) childrenMap.set(pid, [])
      childrenMap.get(pid)!.push(obj.id)
    }
  }

  const allOrigIds: string[] = []
  const bfsQueue = [rootId]
  while (bfsQueue.length) {
    const id = bfsQueue.shift()!
    allOrigIds.push(id)
    for (const childId of childrenMap.get(id) ?? []) {
      bfsQueue.push(childId)
    }
  }

  // Create a fresh UUID for every shape in the component tree.
  // Use the caller-supplied instanceId for the root so the parent frame can
  // include it in its shapes[] before we emit any add-obj.
  const idMap = new Map<string, string>()
  for (const origId of allOrigIds) {
    idMap.set(origId, origId === rootId ? (instanceId ?? randomUUID()) : randomUUID())
  }

  const dx = placeX - root.x
  const dy = placeY - root.y

  const slotValues: Record<string, string> = {
    "fs:title": block.title,
    "fs:body": block.body,
  }

  const changes: ChangeOp[] = []

  for (const origId of allOrigIds) {
    const orig = libPageObjects[origId] as unknown as Record<string, unknown> & PenpotObject
    if (!orig) continue

    const newId = idMap.get(origId)!
    const isRoot = origId === rootId

    const newParentId = isRoot
      ? parentFrameId
      : (idMap.get(orig.parentId ?? "") ?? parentFrameId)

    const newFrameId = isRoot
      ? parentFrameId
      : (idMap.get(orig.frameId ?? "") ?? newParentId)

    // Strip keys that must not be copied to instances:
    //   parentId / frameId  — replaced with kebab-case versions below
    //   positionData        — cached text-layout computed by Penpot; stale after position offset
    const STRIP = new Set(["parentId", "frameId", "positionData"])
    const origRecord = orig as Record<string, unknown>
    const rest: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(origRecord)) {
      if (!STRIP.has(k)) rest[k] = v
    }

    const obj: Record<string, unknown> = {
      ...rest,
      id: newId,
      x: (orig.x as number) + dx,
      y: (orig.y as number) + dy,
      "parent-id": newParentId,
      "frame-id": newFrameId,
      "shape-ref": origId,
      ...shapeGeometry(
        (orig.x as number) + dx,
        (orig.y as number) + dy,
        orig.width as number,
        orig.height as number,
      ),
    }

    // Remap child shape IDs in frames / groups
    if (Array.isArray(obj.shapes)) {
      obj.shapes = (obj.shapes as string[]).map((id) => idMap.get(id) ?? id)
    }

    if (isRoot) {
      obj["component-id"] = componentId
      obj["component-file"] = lib.fileId
      obj["component-root"] = true
      obj.name = `${BLOCK_NAME_PREFIX}${blockIdx}`
    } else {
      // Override slot text content
      const shapeName = (orig.name as string) ?? ""
      if (shapeName.startsWith("fs:") && orig.type === "text") {
        const slotText = slotValues[shapeName]
        if (slotText !== undefined) {
          obj.content = buildSlotTextContent(slotText)
        }
      }
    }

    changes.push({
      type: "add-obj",
      id: newId,
      "page-id": pageId,
      "parent-id": newParentId,
      "frame-id": newFrameId,
      obj,
    })
  }

  return { changes, height: root.height as number }
}

// ---------------------------------------------------------------------------
// Frame change builders
// ---------------------------------------------------------------------------

function buildNewFrameChanges(pageId: string, sheets: SheetData[], lib?: LibData | null): ChangeOp[]
function buildNewFrameChanges(pageId: string, sheet: SheetData, lib?: LibData | null): ChangeOp[]
function buildNewFrameChanges(pageId: string, sheetsOrSheet: SheetData | SheetData[], lib?: LibData | null): ChangeOp[] {
  const sheets = Array.isArray(sheetsOrSheet) ? sheetsOrSheet : [sheetsOrSheet]
  return _buildFrameChanges(pageId, sheets, lib)
}

function _buildFrameChanges(pageId: string, sheets: SheetData[], lib?: LibData | null): ChangeOp[] {
  const changes: ChangeOp[] = []

  for (const sheet of sheets) {
    const frameId = randomUUID()
    const titleId = randomUUID()
    // Pre-generate one root UUID per block so they can go into shapes[] upfront
    const blockInstanceIds = sheet.blocks.map(() => randomUUID())

    const x = sheet.index * (FRAME_WIDTH + FRAME_GAP)
    const textX = x + 40
    const textY = 60
    const textW = FRAME_WIDTH - 80
    const textH = 60

    // Sheet frame — shapes[] must list all direct children in order
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
        shapes: [titleId, ...blockInstanceIds],
        "clip-content": false,
        rotation: 0,
        ...shapeGeometry(x, 0, FRAME_WIDTH, FRAME_HEIGHT),
      },
    })

    // Sheet-level title + body text
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

    // Component instances for each template block
    const BLOCK_GAP = 24
    let blockY = textY + textH + BLOCK_GAP

    for (let i = 0; i < sheet.blocks.length; i++) {
      const block = sheet.blocks[i]
      const instanceId = blockInstanceIds[i]

      if (lib) {
        const { changes: instanceChanges, height } = buildComponentInstance(
          pageId, frameId, textX, blockY, block, i, lib, instanceId,
        )
        changes.push(...instanceChanges)
        blockY += (height || 120) + BLOCK_GAP
      } else {
        // Fallback when library is unavailable: plain labeled text block
        const BLOCK_H = 120
        changes.push({
          type: "add-obj",
          id: instanceId,
          "page-id": pageId,
          "parent-id": frameId,
          "frame-id": frameId,
          obj: {
            id: instanceId,
            name: `${BLOCK_NAME_PREFIX}${i}`,
            type: "text",
            x: textX,
            y: blockY,
            width: textW,
            height: BLOCK_H,
            "parent-id": frameId,
            "frame-id": frameId,
            "grow-type": "auto-height",
            rotation: 0,
            fills: [],
            strokes: [],
            content: buildTextContent(block.title || block.componentName, block.body),
            ...shapeGeometry(textX, blockY, textW, BLOCK_H),
          },
        })
        blockY += BLOCK_H + BLOCK_GAP
      }
    }
  }

  return changes
}

// ---------------------------------------------------------------------------
// Deletion helpers
// ---------------------------------------------------------------------------

type PageObjectsIndex = Record<string, { id: string; name?: string; type?: string; parentId?: string }>

/** Build a parent→children index from the full page objects map. */
function buildChildrenIndex(objects: PageObjectsIndex): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const obj of Object.values(objects)) {
    if (obj.parentId) {
      if (!index.has(obj.parentId)) index.set(obj.parentId, [])
      index.get(obj.parentId)!.push(obj.id)
    }
  }
  return index
}

/**
 * Return all descendant IDs of `rootId` in bottom-up order (leaves first).
 * Penpot requires children to be deleted before their parent.
 */
function collectDescendantsBottomUp(childrenIndex: Map<string, string[]>, rootId: string): string[] {
  // BFS top-down, then reverse for bottom-up deletion order
  const ordered: string[] = []
  const queue = [rootId]
  while (queue.length) {
    const id = queue.shift()!
    for (const childId of childrenIndex.get(id) ?? []) {
      ordered.push(childId)
      queue.push(childId)
    }
  }
  return ordered.reverse()
}

/** Emit del-obj changes for a subtree: children first, then the root itself. */
function deleteSubtree(pageId: string, childrenIndex: Map<string, string[]>, rootId: string): ChangeOp[] {
  const descendants = collectDescendantsBottomUp(childrenIndex, rootId)
  return [
    ...descendants.map((id): ChangeOp => ({ type: "del-obj", id, "page-id": pageId })),
    { type: "del-obj", id: rootId, "page-id": pageId },
  ]
}

// ---------------------------------------------------------------------------

/**
 * Build sync changes between current editor sheets and existing Penpot objects.
 *
 * Strategy: delete-and-recreate every fs-* frame on each save.
 * Simpler and more reliable than mod-obj — avoids Penpot schema validation
 * issues with partial updates. Designers should use "detach" in Penpot if
 * they want to make layout changes that persist across editor saves.
 */
function buildSyncChanges(
  pageId: string,
  page: { id: string; objects: PageObjectsIndex },
  sheets: SheetData[],
  lib?: LibData | null,
): ChangeOp[] {
  const changes: ChangeOp[] = []

  const childrenIndex = buildChildrenIndex(page.objects)

  // Find all existing fs-* frames
  const existingFrames: { id: string; name: string }[] = []
  for (const obj of Object.values(page.objects)) {
    if (obj.type === "frame" && obj.name?.startsWith(FRAME_NAME_PREFIX)) {
      existingFrames.push(obj as { id: string; name: string })
    }
  }

  // Delete all existing frames (children first)
  for (const frame of existingFrames) {
    console.log(`[penpot-sync] removing frame ${frame.name} for recreation`)
    changes.push(...deleteSubtree(pageId, childrenIndex, frame.id))
  }

  // Recreate all current sheets fresh
  changes.push(...buildNewFrameChanges(pageId, sheets, lib))

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
    let existingPage: { id: string; objects: PageObjectsIndex } | null = null

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
      const rawPage = file.data.pagesIndex[pageId]
      if (rawPage) {
        existingPage = { id: rawPage.id, objects: rawPage.objects as PageObjectsIndex }
      }
    }

    const sessionId = randomUUID()
    const sheets = extractSheets(doc.content as TipTapNode)

    // Component instance cloning is disabled until the shape payload format is
    // confirmed valid with Penpot. Passing lib=null uses plain text fallback.
    const lib = null

    const changes = existingPage
      ? buildSyncChanges(pageId, existingPage, sheets, lib)   // delete existing fs-* frames + recreate
      : buildNewFrameChanges(pageId, sheets, lib)              // first sync — add all frames fresh

    console.log(
      `[penpot-sync] doc=${doc.id.slice(0, 8)} sheets=${sheets.length} changes=${changes.length}`,
      changes.map((c) => `${c.type}:${c.id.slice(0, 8)}`).join(" "),
    )

    if (changes.length === 0) return

    await updateFile(fileId, revn, vern, sessionId, changes)
    console.log(`[penpot-sync] ok revn=${revn}`)
  } catch (err) {
    console.error("[penpot-sync] failed:", err)
  }
}

/**
 * Populate a brand-new Penpot file with the initial document structure.
 *
 * Skips component instance cloning for now — just frames + title text.
 * This lets us verify basic frame creation before adding complexity.
 * Uses the revn/pageId already returned by createFile, avoiding a getFile round-trip.
 */
export async function syncNewFile(
  fileId: string,
  revn: number,
  vern: number,
  pageId: string,
  content: unknown,
): Promise<void> {
  try {
    const sheets = extractSheets(content as TipTapNode)
    console.log(`[penpot-sync] syncNewFile: ${sheets.length} sheets`)
    if (sheets.length === 0) return

    // Pass lib=null for now: skip component instance cloning so the entire
    // updateFile batch doesn't fail if an instance payload is malformed.
    // Frames + title text still populate correctly.
    const changes = buildNewFrameChanges(pageId, sheets, null)
    console.log(`[penpot-sync] syncNewFile: ${changes.length} changes`)
    if (changes.length === 0) return

    await updateFile(fileId, revn, vern, randomUUID(), changes)
    console.log(`[penpot-sync] syncNewFile ok`)
  } catch (err) {
    console.error("[penpot-sync] syncNewFile failed:", err)
  }
}
