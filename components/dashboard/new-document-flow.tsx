"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">
        New Document
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-10">
        Start from a template or open a blank document.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Blank option */}
        <button
          type="button"
          onClick={() => onSelect(BLANK_CONTENT, "Untitled Document")}
          className="flex flex-col items-start gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 text-left hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors"
        >
          <span className="text-2xl leading-none">📄</span>
          <span className="text-sm font-medium text-zinc-900 dark:text-white">
            Blank
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Start from scratch
          </span>
        </button>

        {/* Template options */}
        {loading ? (
          <div className="col-span-2 text-sm text-zinc-400 dark:text-zinc-500 py-4">
            Loading templates…
          </div>
        ) : (
          templates.map((tmpl) => (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => pickTemplate(tmpl)}
              disabled={fetching === tmpl.id}
              className="flex flex-col items-start gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 p-5 text-left hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors disabled:opacity-50"
            >
              <span className="text-2xl leading-none">📋</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                {tmpl.name}
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {fetching === tmpl.id ? "Loading…" : "From Penpot template"}
              </span>
            </button>
          ))
        )}
      </div>
    </main>
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

  // Once the user saves inside the editor, redirect to the saved doc URL.
  // We hook into the editor's save by watching for the router replace that
  // editor-layout.tsx already does after a successful POST.
  // Nothing extra needed here — EditorLayout calls router.replace on save.

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
