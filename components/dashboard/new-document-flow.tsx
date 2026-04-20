"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DocumentPlusIcon } from "@heroicons/react/24/outline"
import { ArrowLeftIcon } from "@heroicons/react/20/solid"
import Link from "next/link"
import { EditorLayout } from "@/components/editor/editor-layout"
import { docPath } from "@/lib/doc-url"
import type { Content } from "@tiptap/core"

interface Template {
  id: string
  name: string
}

const BLANK_CONTENT: Content = {
  type: "doc",
  content: [
    {
      type: "sheet",
      attrs: { index: 0, layoutId: "single-column" },
      content: [
        {
          type: "heading",
          attrs: { level: 1, textAlign: null },
          content: [{ type: "text", text: "Untitled Document" }],
        },
        {
          type: "paragraph",
          attrs: { textAlign: null },
          content: [{ type: "text", text: "Start writing…" }],
        },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------

function TemplateCard({
  icon,
  name,
  description,
  loading,
  onClick,
}: {
  icon: React.ReactNode
  name: string
  description: string
  loading?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="cursor-pointer group relative flex flex-col gap-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 text-left shadow-sm hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-wait"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          {loading ? "Loading…" : name}
        </p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Template picker screen
// ---------------------------------------------------------------------------

function TemplatePicker({
  onSelect,
}: {
  onSelect: (content: Content, title: string) => void
}) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/penpot/templates")
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])

  async function pickTemplate(tmpl: Template) {
    setFetching(tmpl.id)
    try {
      const res = await fetch(`/api/penpot/templates/${tmpl.id}`)
      const data = await res.json()
      onSelect(data.content as Content, tmpl.name)
    } catch {
      setFetching(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            My Documents
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
            New Document
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Choose a template to get started.
          </p>
        </div>

        <div className="mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Start from scratch
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-10">
          <TemplateCard
            icon={<DocumentPlusIcon className="size-5" />}
            name="Blank"
            description="An empty document"
            onClick={() => onSelect(BLANK_CONTENT, "Untitled Document")}
          />
        </div>

        <div className="mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Templates
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 animate-pulse"
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            No templates found. Add template files to your Penpot templates project.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {templates.map((tmpl) => (
              <TemplateCard
                key={tmpl.id}
                icon={
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="size-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                name={tmpl.name}
                description="Penpot template"
                loading={fetching === tmpl.id}
                onClick={() => pickTemplate(tmpl)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main flow — picker → editor
// ---------------------------------------------------------------------------

export function NewDocumentFlow() {
  const router = useRouter()
  const [initialContent, setInitialContent] = useState<Content | null>(null)
  const [initialTitle, setInitialTitle] = useState<string>("Untitled Document")

  function handleSelect(content: Content, title: string) {
    setInitialTitle(title)
    setInitialContent(content)
  }

  if (!initialContent) {
    return <TemplatePicker onSelect={handleSelect} />
  }

  return (
    <EditorLayout
      initialDoc={{
        id: "",
        title: initialTitle,
        content: initialContent,
      }}
    />
  )
}
