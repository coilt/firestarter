import Link from "next/link"
import { prisma } from "@/lib/db"
import { DocList } from "@/components/dashboard/doc-list"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const documents = await prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  })

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
          My Documents
        </h1>
        <Link
          href="/documents/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Document
        </Link>
      </div>

      <DocList documents={documents} />
    </main>
  )
}
