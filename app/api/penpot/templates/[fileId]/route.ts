/**
 * GET /api/penpot/templates/[fileId]
 *
 * Reads a Penpot template file and returns the initial TipTap document content.
 *
 * The template file contains:
 *   - Frames named "fs-{n}" → one sheet per frame, ordered by index
 *   - Component instances inside each frame (from fs_library) → templateBlock nodes
 *
 * The returned `content` is ready to pass as `initialContent` to SheetEditor
 * or as `content` in POST /api/documents.
 */

import { getFile, type PenpotObject } from "@/lib/penpot"

const LIBRARY_FILE_ID = process.env.PENPOT_LIBRARY_FILE_ID ?? ""
const FRAME_PREFIX = "fs-"

// ---------------------------------------------------------------------------
// TipTap node builders
// ---------------------------------------------------------------------------

function emptyParagraph() {
  return { type: "paragraph", attrs: { textAlign: null }, content: [] }
}

function templateBlockNode(componentId: string, componentName: string, componentPath: string) {
  return {
    type: "templateBlock",
    attrs: { componentId, componentName, componentPath },
    content: [emptyParagraph()],
  }
}

function sheetNode(index: number, blocks: ReturnType<typeof templateBlockNode>[]) {
  return {
    type: "sheet",
    attrs: { index, layoutId: "single-column" },
    content: [
      {
        type: "heading",
        attrs: { level: 1, textAlign: null },
        content: [{ type: "text", text: "Untitled" }],
      },
      ...blocks,
      // Always end with an empty paragraph so the cursor has somewhere to land
      emptyParagraph(),
    ],
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/penpot/templates/[fileId]">
) {
  const { fileId } = await ctx.params

  try {
    // Fetch template file + library in parallel
    const [templateFile, libFile] = await Promise.all([
      getFile(fileId),
      LIBRARY_FILE_ID ? getFile(LIBRARY_FILE_ID) : Promise.resolve(null),
    ])

    // Build componentId → {name, path} lookup from the library
    const componentMap = new Map<string, { name: string; path: string }>()
    if (libFile?.data.components) {
      for (const comp of Object.values(libFile.data.components)) {
        componentMap.set(comp.id, { name: comp.name, path: comp.path ?? "" })
      }
    }

    // Read first page of the template file
    const pageId = templateFile.data.pages[0]
    const page = templateFile.data.pagesIndex[pageId]
    if (!page) {
      return Response.json({ error: "Template file has no pages" }, { status: 422 })
    }

    const objects = page.objects

    // Find all fs-* frames, sort by their numeric index
    const frames = Object.values(objects)
      .filter(
        (obj): obj is PenpotObject =>
          obj.type === "frame" && obj.name.startsWith(FRAME_PREFIX)
      )
      .sort((a, b) => {
        const ai = parseInt(a.name.slice(FRAME_PREFIX.length), 10)
        const bi = parseInt(b.name.slice(FRAME_PREFIX.length), 10)
        return ai - bi
      })

    if (frames.length === 0) {
      return Response.json(
        { error: `No frames named "${FRAME_PREFIX}N" found in template` },
        { status: 422 }
      )
    }

    // For each frame, collect the root component instances that are direct children.
    // Re-index from 0 regardless of the fs-N naming in Penpot.
    const sheets = frames.map((frame, sheetIndex) => {

      const blocks = Object.values(objects)
        .filter(
          (obj) =>
            obj.parentId === frame.id &&
            obj.componentId &&
            obj.componentRoot === true
        )
        .map((obj) => {
          const comp = componentMap.get(obj.componentId!)
          const name = comp?.name ?? obj.name
          const path = comp?.path ?? ""
          const fullPath = path ? `${path}/${name}` : name
          return templateBlockNode(obj.componentId!, name, fullPath)
        })

      return sheetNode(sheetIndex, blocks)
    })

    const content = { type: "doc", content: sheets }

    return Response.json({
      id: fileId,
      name: templateFile.name,
      content,
    })
  } catch (err) {
    console.error("[penpot/templates/:fileId] failed:", err)
    return Response.json({ error: "Failed to read template" }, { status: 500 })
  }
}
