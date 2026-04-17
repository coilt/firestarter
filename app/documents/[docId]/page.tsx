import { notFound } from "next/navigation"
import type { Content } from "@tiptap/core"
import { prisma } from "@/lib/db"
import { shortIdFromParam } from "@/lib/doc-url"
import { EditorLayout } from "@/components/editor/editor-layout"

export default async function DocumentPage(
  props: PageProps<"/documents/[docId]">
) {
  const { docId } = await props.params
  const shortId = shortIdFromParam(docId)

  const doc = await prisma.document.findFirst({
    where: { id: { startsWith: shortId } },
  })

  if (!doc) notFound()

  return (
    <EditorLayout
      initialDoc={{
        id: doc.id,
        title: doc.title,
        content: doc.content as Content,
      }}
    />
  )
}
