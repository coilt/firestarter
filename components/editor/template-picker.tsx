"use client"

import { useEffect, useRef, useState } from "react"
import type { ComponentCatalog } from "@/app/api/penpot/components/route"

// ---------------------------------------------------------------------------
// Catalog hook
// ---------------------------------------------------------------------------

export function useComponentCatalog() {
  const [catalog, setCatalog] = useState<ComponentCatalog | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/penpot/components")
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { catalog, loading }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InsertableComponent {
  id: string
  name: string
  path: string
  fullPath: string
  slots: string[]
}

interface TemplatePickerProps {
  catalog: ComponentCatalog | null
  loading: boolean
  onInsert: (comp: InsertableComponent) => void
}

// ---------------------------------------------------------------------------
// Component preview image
// ---------------------------------------------------------------------------

function ComponentPreview({ componentId }: { componentId: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
        <svg className="size-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/penpot/components/${componentId}/preview`}
      alt=""
      onError={() => setFailed(true)}
      className="w-full h-full object-contain object-top p-1"
    />
  )
}

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------

export function TemplatePicker({ catalog, loading, onInsert }: TemplatePickerProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (loading) {
    return <p className="px-2 py-1 text-xs text-zinc-400">Loading…</p>
  }

  if (!catalog) return null

  return (
    <div className="space-y-0.5">
      {catalog.groups.map((group) => (
        <div key={group.name}>
          <p className="px-2 pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            {group.name}
          </p>
          {group.components.map((comp) => (
            <div key={comp.id}>
              <button
                onClick={() => setExpanded(expanded === comp.id ? null : comp.id)}
                className="w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60 flex items-center justify-between gap-2"
              >
                <span>{comp.name}</span>
                <span className="text-zinc-300 dark:text-zinc-600 text-xs">
                  {expanded === comp.id ? "▲" : "▼"}
                </span>
              </button>

              {expanded === comp.id && (
                <div className="mx-2 mb-2 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                  {/* Preview */}
                  <div className="aspect-[4/3] bg-zinc-50 dark:bg-zinc-800">
                    <ComponentPreview componentId={comp.id} />
                  </div>
                  {/* Insert button */}
                  <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => onInsert(comp)}
                      className="w-full rounded-md bg-zinc-900 dark:bg-white px-3 py-1.5 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                    >
                      Insert
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
