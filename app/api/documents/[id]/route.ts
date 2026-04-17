import { prisma } from "@/lib/db"
import { syncToPenpot } from "@/lib/penpot-sync"
import { deleteFile } from "@/lib/penpot"

// Resolve a document by its 8-char shortId (first segment of the CUID).
async function findByShortId(shortId: string) {
  return prisma.document.findFirst({
    where: { id: { startsWith: shortId } },
  })
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/documents/[id]">
) {
  const { id } = await ctx.params
  const doc = await findByShortId(id)
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 })
  return Response.json(doc)
}

export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/documents/[id]">
) {
  const { id } = await ctx.params
  const doc = await findByShortId(id)
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.document.update({
    where: { id: doc.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content }),
      version: { increment: 1 },
    },
  })

  // Fire-and-forget — sync failure must never block the save response
  syncToPenpot(updated).catch(() => {})

  return Response.json(updated)
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/documents/[id]">
) {
  const { id } = await ctx.params
  const doc = await findByShortId(id)
  if (!doc) return Response.json({ error: "Not found" }, { status: 404 })

  await prisma.document.delete({ where: { id: doc.id } })

  if (doc.penpotFileId) {
    deleteFile(doc.penpotFileId).catch((err) =>
      console.error("[penpot] failed to delete file:", err)
    )
  }

  return new Response(null, { status: 204 })
}
