/** Generate a URL-safe slug from a document title. */
export function toSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "untitled"
  )
}

/** Build the canonical path for a document: /documents/[slug]-[shortId] */
export function docPath(doc: { id: string; title: string }): string {
  const shortId = doc.id.slice(0, 8)
  const slug = toSlug(doc.title)
  return `/documents/${slug}-${shortId}`
}

/**
 * Extract the shortId from the [docId] route param.
 * The param is shaped like "my-title-ck8x9p2f" — the shortId is always
 * the last dash-separated segment.
 */
export function shortIdFromParam(docId: string): string {
  return docId.split("-").at(-1) ?? docId
}
