"use client"

import { useEffect, useRef, useState } from "react"
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
  thumbnailUrl,
  loading,
  onClick,
}: {
  icon: React.ReactNode
  name: string
  description: string
  thumbnailUrl?: string
  loading?: boolean
  onClick: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const showThumbnail = thumbnailUrl && !imgFailed

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="cursor-pointer group relative flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-left shadow-sm hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-wait overflow-hidden"
    >
      {/* Preview area */}
      <div className="relative w-full aspect-4/3 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {showThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={name}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400 dark:text-zinc-600">
            {icon}
          </div>
        )}
      </div>

      {/* Label */}
      <div className="px-4 py-3">
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
// Template card with thumbnail upload
// ---------------------------------------------------------------------------

function TemplateCardWithUpload({
  tmpl,
  loading,
  editMode,
  onPick,
}: {
  tmpl: { id: string; name: string }
  loading: boolean
  editMode: boolean
  onPick: () => void
}) {
  const [thumbKey, setThumbKey] = useState(0)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const thumbnailUrl = `/api/penpot/templates/${tmpl.id}/thumbnail?v=${thumbKey}`

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append("thumbnail", file)
    await fetch(`/api/penpot/templates/${tmpl.id}/thumbnail`, { method: "POST", body: form })
    setThumbKey((k) => k + 1)
    setUploading(false)
  }

  return (
    <div className="group relative flex flex-col rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-md transition-all overflow-hidden">
      {/* Clickable preview area */}
      <button
        type="button"
        onClick={onPick}
        disabled={loading}
        className="cursor-pointer w-full text-left disabled:opacity-50 disabled:cursor-wait"
      >
        <div className="relative w-full aspect-4/3 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={thumbKey}
            src={thumbnailUrl}
            alt={tmpl.name}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            className="w-full h-full object-cover object-top"
          />
          {/* Upload overlay — only in edit mode */}
          {editMode && (
            <div
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 cursor-pointer"
            >
              <span className="text-xs font-semibold text-white bg-black/60 rounded-md px-2 py-1">
                {uploading ? "Uploading…" : "Upload thumbnail"}
              </span>
            </div>
          )}
        </div>
        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            {loading ? "Loading…" : tmpl.name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">Penpot template</p>
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
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
  const [editMode, setEditMode] = useState(false)

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

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Templates
          </h2>
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            {editMode ? "Done" : "Edit thumbnails"}
          </button>
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
              <TemplateCardWithUpload
                key={tmpl.id}
                tmpl={tmpl}
                loading={fetching === tmpl.id}
                editMode={editMode}
                onPick={() => pickTemplate(tmpl)}
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
