import { getFile } from "@/lib/penpot"
import { renderShapePreview } from "@/lib/penpot-preview"

const LIBRARY_FILE_ID = process.env.PENPOT_LIBRARY_FILE_ID ?? ""

let _cache: { file: Awaited<ReturnType<typeof getFile>>; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

async function getLibraryFile() {
  const now = Date.now()
  if (_cache && now - _cache.ts < CACHE_TTL) return _cache.file
  const file = await getFile(LIBRARY_FILE_ID)
  _cache = { file, ts: now }
  return file
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ componentId: string }> },
) {
  if (!LIBRARY_FILE_ID) return new Response(null, { status: 503 })

  const { componentId } = await params

  try {
    const file = await getLibraryFile()
    const comp = file.data.components?.[componentId]
    if (!comp?.mainInstanceId || !comp.mainInstancePage) {
      return new Response(null, { status: 404 })
    }

    const page = file.data.pagesIndex[comp.mainInstancePage]
    if (!page) return new Response(null, { status: 404 })

    const objs = page.objects as Record<string, unknown>
    const svg = renderShapePreview(objs, comp.mainInstanceId)
    if (!svg) return new Response(null, { status: 404 })

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    })
  } catch (err) {
    console.error("[penpot/components/preview] failed:", err)
    return new Response(null, { status: 500 })
  }
}
