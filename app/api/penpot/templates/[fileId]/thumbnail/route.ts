import { NextResponse } from "next/server"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"

const uploadsDir = join(process.cwd(), "uploads", "thumbnails")

function thumbPath(fileId: string) {
  // Only allow alphanumeric + hyphens to prevent path traversal
  const safe = fileId.replace(/[^a-zA-Z0-9-]/g, "")
  return join(uploadsDir, `${safe}.jpg`)
}

/** GET — serve the uploaded thumbnail if it exists. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params
  try {
    const data = await readFile(thumbPath(fileId))
    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    })
  } catch {
    return new NextResponse(null, { status: 404 })
  }
}

/** POST — accept a multipart upload and save it as the template thumbnail. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params
  const formData = await req.formData()
  const file = formData.get("thumbnail")

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "thumbnail field required" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  await writeFile(thumbPath(fileId), Buffer.from(bytes))
  return NextResponse.json({ ok: true })
}
