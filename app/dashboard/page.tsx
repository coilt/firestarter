import Link from "next/link"
import { prisma } from "@/lib/db"
import { docPath } from "@/lib/doc-url"

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

      {documents.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          No documents yet.{" "}
          <Link href="/documents/new" className="underline">
            Create your first one.
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
          {documents.map((doc: (typeof documents)[number]) => (
            <li key={doc.id}>
              <Link
                href={docPath(doc)}
                className="flex items-center justify-between py-4 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                  {doc.title}
                </span>
                <span className="ml-4 shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
