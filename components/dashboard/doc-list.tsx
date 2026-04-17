"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { docPath } from "@/lib/doc-url"

interface Doc {
  id: string
  title: string
  updatedAt: Date
}

export function DocList({ documents }: { documents: Doc[] }) {
  const router = useRouter()

  async function handleDelete(doc: Doc) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return
    await fetch(`/api/documents/${doc.id.slice(0, 8)}`, { method: "DELETE" })
    router.refresh()
  }

  if (documents.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400 text-sm">
        No documents yet.{" "}
        <Link href="/documents/new" className="underline">
          Create your first one.
        </Link>
      </p>
    )
  }

  return (
    <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between py-4 group">
          <Link
            href={docPath(doc)}
            className="flex-1 min-w-0 text-sm font-medium text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors truncate pr-4"
          >
            {doc.title}
          </Link>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {new Date(doc.updatedAt).toISOString().slice(0, 10)}
            </span>
            <button
              onClick={() => handleDelete(doc)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
              aria-label={`Delete ${doc.title}`}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
