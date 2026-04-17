"use client"

import { useEffect, useState } from "react"
import type { ComponentCatalog } from "@/app/api/penpot/components/route"

// ---------------------------------------------------------------------------
// Catalog hook — fetch once, stable across active-sheet changes
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
// Presentational picker — receives catalog as prop, no fetching
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

export function TemplatePicker({ catalog, loading, onInsert }: TemplatePickerProps) {
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
            <button
              key={comp.id}
              onClick={() => onInsert(comp)}
              className="w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/60"
            >
              {comp.name}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
