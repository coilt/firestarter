/**
 * POST /api/penpot/webhook
 *
 * Receives change notifications from Penpot (designer → DB direction).
 * Penpot signs each request with HMAC-SHA256 using the shared secret set in
 * the Penpot webhook settings. We verify the signature before processing.
 *
 * Configure in Penpot: Profile → Webhooks → URI = https://your-domain/api/penpot/webhook
 *
 * TODO (Phase 2): parse the changed objects, extract text content, and write
 * back to the matching Document in the DB. For now we verify and acknowledge.
 */

import { createHmac, timingSafeEqual } from "crypto"
import { prisma } from "@/lib/db"

const WEBHOOK_SECRET = process.env.PENPOT_WEBHOOK_SECRET ?? ""

// ---------------------------------------------------------------------------
// HMAC verification
// ---------------------------------------------------------------------------

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false
  const expected = createHmac("sha256", WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"))
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Event types (minimal — extend as Penpot adds more)
// ---------------------------------------------------------------------------

interface PenpotWebhookEvent {
  type: "create" | "update" | "delete"
  "file-id": string
  "team-id"?: string
  data?: unknown
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export function GET() {
  return new Response(null, { status: 200 })
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get("x-penpot-signature")

  // Skip verification when secret is not yet configured (e.g. during webhook setup)
  if (WEBHOOK_SECRET && !verifySignature(rawBody, signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 })
  }

  let event: PenpotWebhookEvent
  try {
    event = JSON.parse(rawBody) as PenpotWebhookEvent
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const fileId = event["file-id"]

  if (!fileId) {
    return Response.json({ error: "Missing file-id" }, { status: 400 })
  }

  // Find the document linked to this Penpot file
  const doc = await prisma.document.findFirst({
    where: { penpotFileId: fileId },
    select: { id: true, title: true },
  })

  if (!doc) {
    // No document linked to this file — nothing to do
    return new Response(null, { status: 204 })
  }

  if (event.type === "update") {
    // TODO (Phase 2): fetch changed objects from Penpot, extract updated text
    // content, and patch the matching sheet nodes in doc.content, then:
    //   await prisma.document.update({ where: { id: doc.id }, data: { content: mergedContent } })
    console.log(`[penpot-webhook] update on file ${fileId} → document ${doc.id}`)
  }

  if (event.type === "delete") {
    // Designer deleted the Penpot file — unlink it from our document
    await prisma.document.update({
      where: { id: doc.id },
      data: { penpotFileId: null },
    })
    console.log(`[penpot-webhook] file ${fileId} deleted, unlinked from document ${doc.id}`)
  }

  return new Response(null, { status: 204 })
}
