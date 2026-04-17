/**
 * POST /api/penpot/sync?id=<shortId>
 *
 * Manually trigger a Penpot sync for a document. Useful for debugging —
 * returns a summary of what changes were computed and whether the sync succeeded.
 */

import { prisma } from "@/lib/db"
import { syncToPenpot } from "@/lib/penpot-sync"

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const shortId = searchParams.get("id")
  if (!shortId) {
    return Response.json({ error: "?id= required" }, { status: 400 })
  }

  const doc = await prisma.document.findFirst({
    where: { id: { startsWith: shortId } },
  })
  if (!doc) {
    return Response.json({ error: "Document not found" }, { status: 404 })
  }

  try {
    await syncToPenpot(doc)
    return Response.json({ ok: true, docId: doc.id, penpotFileId: doc.penpotFileId })
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
