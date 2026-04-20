import Link from "next/link"
import { PlusIcon } from "@heroicons/react/20/solid"
import { prisma } from "@/lib/db"
import { DocList } from "@/components/dashboard/doc-list"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const documents = await prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
              My Documents
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {documents.length === 0
                ? "No documents yet"
                : `${documents.length} document${documents.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Link
            href="/documents/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            <PlusIcon aria-hidden="true" className="-ml-0.5 size-4" />
            New Document
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm px-6">
          <DocList documents={documents} />
        </div>
      </div>
    </div>
  )
}
