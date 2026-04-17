/**
 * GET /api/penpot/components
 *
 * Returns the component catalog from the Firestarter design library file.
 * Reads the library via Penpot's get-file RPC, parses data.components,
 * groups by folder path, and extracts fs: content slots from each component's objects.
 *
 * Requires PENPOT_LIBRARY_FILE_ID in env.
 */

import { getFile, type PenpotObject } from "@/lib/penpot"

const LIBRARY_FILE_ID = process.env.PENPOT_LIBRARY_FILE_ID ?? ""

// ---------------------------------------------------------------------------
// Slot extraction
// ---------------------------------------------------------------------------

/**
 * Find all fs: named shapes that are descendants of rootId within the given
 * objects map. Uses BFS via the parent-id tree so depth doesn't matter.
 */
function findSlots(objects: Record<string, PenpotObject>, rootId: string): string[] {
  // Build parent → children index
  const children = new Map<string, string[]>()
  for (const obj of Object.values(objects)) {
    const parentId = obj.parentId
    if (parentId) {
      if (!children.has(parentId)) children.set(parentId, [])
      children.get(parentId)!.push(obj.id)
    }
  }

  // BFS from the component's root frame
  const slots: string[] = []
  const queue = [rootId]
  while (queue.length) {
    const current = queue.shift()!
    for (const childId of children.get(current) ?? []) {
      const child = objects[childId]
      if (!child) continue
      if (child.name.startsWith("fs:")) slots.push(child.name)
      queue.push(childId)
    }
  }
  return slots
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface CatalogComponent {
  id: string
  name: string      // e.g. "Hero"
  path: string      // e.g. "Benchmark"
  fullPath: string  // e.g. "Benchmark/Hero"
  slots: string[]   // e.g. ["fs:title", "fs:body"]
}

export interface CatalogGroup {
  name: string
  components: CatalogComponent[]
}

export interface ComponentCatalog {
  fileId: string
  groups: CatalogGroup[]
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET() {
  if (!LIBRARY_FILE_ID) {
    return Response.json(
      { error: "PENPOT_LIBRARY_FILE_ID is not configured" },
      { status: 503 }
    )
  }

  try {
    const file = await getFile(LIBRARY_FILE_ID)
    const rawComponents = file.data.components ?? {}

    const items: CatalogComponent[] = []

    for (const comp of Object.values(rawComponents)) {
      // Slots live in the page, not on the component definition itself.
      // Walk from the main-instance-id frame down through all descendants.
      let slots: string[] = []
      const pageId = comp.mainInstancePage
      const instanceId = comp.mainInstanceId
      if (pageId && instanceId) {
        const page = file.data.pagesIndex[pageId]
        if (page) slots = findSlots(page.objects, instanceId)
      }

      items.push({
        id: comp.id,
        name: comp.name,
        path: comp.path ?? "",
        fullPath: comp.path ? `${comp.path}/${comp.name}` : comp.name,
        slots,
      })
    }

    // Group by path (folder), sorted alphabetically
    const groupMap = new Map<string, CatalogComponent[]>()
    for (const item of items) {
      const key = item.path || "Uncategorized"
      if (!groupMap.has(key)) groupMap.set(key, [])
      groupMap.get(key)!.push(item)
    }

    const groups: CatalogGroup[] = Array.from(groupMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, components]) => ({
        name,
        components: components.sort((a, b) => a.name.localeCompare(b.name)),
      }))

    return Response.json({ fileId: LIBRARY_FILE_ID, groups } satisfies ComponentCatalog)
  } catch (err) {
    console.error("[penpot/components] failed:", err)
    return Response.json({ error: "Failed to fetch component catalog" }, { status: 500 })
  }
}
