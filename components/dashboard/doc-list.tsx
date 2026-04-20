"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { PlusIcon } from "@heroicons/react/20/solid"
import { docPath } from "@/lib/doc-url"

interface Doc {
  id: string
  title: string
  updatedAt: Date
}

function DocRow({ doc, onDelete }: { doc: Doc; onDelete: (doc: Doc) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(doc.title)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(doc.title)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commitRename() {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === doc.title) {
      setEditing(false)
      return
    }
    await fetch(`/api/documents/${doc.id.slice(0, 8)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    })
    doc.title = trimmed
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitRename()
    if (e.key === "Escape") setEditing(false)
  }

  return (
    <li className="flex items-center justify-between py-4 group">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitRename}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 text-sm font-medium text-zinc-900 dark:text-white bg-transparent border-b border-zinc-400 dark:border-zinc-500 outline-none pr-4"
          autoFocus
        />
      ) : (
        <Link
          href={docPath(doc)}
          className="flex-1 min-w-0 text-sm font-medium text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors truncate pr-4"
        >
          {doc.title}
        </Link>
      )}

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {new Date(doc.updatedAt).toISOString().slice(0, 10)}
        </span>
        <button
          onClick={startEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
          aria-label={`Rename ${doc.title}`}
        >
          Rename
        </button>
        <button
          onClick={() => onDelete(doc)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400"
          aria-label={`Delete ${doc.title}`}
        >
          Delete
        </button>
      </div>
    </li>
  )
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
      <div className="text-center py-16">
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="mx-auto size-12 text-zinc-300 dark:text-zinc-600"
        >
          <path
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h3 className="mt-3 text-sm font-semibold text-zinc-900 dark:text-white">
          No documents
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Get started by creating your first document.
        </p>
        <div className="mt-6">
          <Link
            href="/documents/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <PlusIcon aria-hidden="true" className="-ml-0.5 size-4" />
            New Document
          </Link>
        </div>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
      {documents.map((doc) => (
        <DocRow key={doc.id} doc={doc} onDelete={handleDelete} />
      ))}
    </ul>
  )
}
