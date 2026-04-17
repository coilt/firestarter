"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import LeftPanel from "../ui/catalyst/left-panel"

import { SheetEditor, type SheetSummary, type EditorCommands } from "@/components/editor/sheet-editor"
import type { Content } from "@tiptap/core"
import { SheetPanel } from "@/components/editor/sheet-panel"
import { docPath } from "@/lib/doc-url"

import "@/components/editor/editor-layout.scss"

type SaveState = "idle" | "saving" | "saved" | "error"

interface InitialDoc {
  id: string
  title: string
  content: Content
}

// ---------------------------------------------------------------------------
// Left sidebar — doc metadata
// ---------------------------------------------------------------------------

function DocSidebar({
  title,
  onTitleChange,
  sheetCount,
  layoutId,
  onSave,
  saveState,
}: {
  title: string
  onTitleChange: (v: string) => void
  sheetCount: number
  layoutId: string
  onSave: () => void
  saveState: SaveState
}) {
  return (
    <LeftPanel
      title={title}
      onTitleChange={onTitleChange}
      sheetCount={sheetCount}
      layoutId={layoutId}
      onSave={onSave}
      saveState={saveState}
    />
  )
}

// ---------------------------------------------------------------------------
// EditorLayout
// ---------------------------------------------------------------------------

export function EditorLayout({ initialDoc }: { initialDoc?: InitialDoc } = {}) {
  const router = useRouter()
  const [title, setTitle] = useState(initialDoc?.title ?? "Untitled Document")
  const [sheets, setSheets] = useState<SheetSummary[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>("idle")

  // shortId of the saved document — null until first save
  const shortIdRef = useRef<string | null>(
    initialDoc ? initialDoc.id.slice(0, 8) : null
  )
  // Keep title accessible inside the save callback without stale closure
  const titleRef = useRef(title)
  useEffect(() => { titleRef.current = title }, [title])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const editorCommandsRef = useRef<EditorCommands | null>(null)

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  const handleSave = useCallback(async () => {
    const content = editorCommandsRef.current?.getContent()
    if (!content) return

    setSaveState("saving")
    try {
      if (shortIdRef.current) {
        await fetch(`/api/documents/${shortIdRef.current}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: titleRef.current, content }),
        })
      } else {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: titleRef.current, content }),
        })
        const doc = await res.json()
        shortIdRef.current = doc.id.slice(0, 8)
        router.replace(docPath({ id: doc.id, title: doc.title }))
      }
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 2000)
    } catch {
      setSaveState("error")
    }
  }, [router])

  // ---------------------------------------------------------------------------
  // Scroll → active sheet sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const sheetEls = container.querySelectorAll<HTMLElement>(
        "[data-type='sheet']"
      )
      const containerRect = container.getBoundingClientRect()
      const midY = containerRect.top + containerRect.height / 2

      let best = 0
      sheetEls.forEach((el, i) => {
        const rect = el.getBoundingClientRect()
        if (rect.top <= midY) best = i
      })

      setActiveIndex(best)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => container.removeEventListener("scroll", handleScroll)
  }, [sheets.length])

  // ---------------------------------------------------------------------------
  // Click on thumbnail → scroll to that sheet
  // ---------------------------------------------------------------------------
  const scrollToSheet = useCallback((index: number) => {
    const container = scrollContainerRef.current
    if (!container) return

    const sheetEls = container.querySelectorAll<HTMLElement>(
      "[data-type='sheet']"
    )
    const target = sheetEls[index]
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Sheet commands
  // ---------------------------------------------------------------------------
  const handleAddSheet = useCallback(() => {
    editorCommandsRef.current?.addSheet()
  }, [])

  const handleRemoveSheet = useCallback(() => {
    editorCommandsRef.current?.removeCurrentSheet()
  }, [])

  const activeLayoutId =
    sheets.find((s) => s.index === activeIndex)?.layoutId ?? "single-column"

  return (
    <div className="editor-layout">
      {/* ── Left sidebar ───────────────────────────────────── */}
      <div className="editor-layout__sidebar bg-white dark:bg-zinc-900 border-r border-zinc-950/5 dark:border-white/5">
        <DocSidebar
          title={title}
          onTitleChange={setTitle}
          sheetCount={sheets.length}
          layoutId={activeLayoutId}
          onSave={handleSave}
          saveState={saveState}
        />
      </div>

      {/* ── Centre: editor ─────────────────────────────────── */}
      <div className="editor-layout__center">
        <SheetEditor
          scrollContainerRef={scrollContainerRef as React.RefObject<HTMLDivElement>}
          onSheetsChange={setSheets}
          initialContent={initialDoc?.content}
          onCommandsReady={(cmds) => {
            editorCommandsRef.current = cmds
          }}
        />
      </div>

      {/* ── Right: sheet panel ─────────────────────────────── */}
      <div className="editor-layout__panel">
        <SheetPanel
          sheets={sheets}
          activeIndex={activeIndex}
          onSheetClick={scrollToSheet}
          onAddSheet={handleAddSheet}
          onRemoveSheet={handleRemoveSheet}
          canRemove={sheets.length > 1}
        />
      </div>
    </div>
  )
}
