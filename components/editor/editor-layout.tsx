"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import LeftPanel from "../ui/catalyst/left-panel"

import { SheetEditor, type SheetSummary } from "@/components/editor/sheet-editor"
import { SheetPanel } from "@/components/editor/sheet-panel"

import "@/components/editor/editor-layout.scss"

// ---------------------------------------------------------------------------
// Left sidebar — doc metadata
// ---------------------------------------------------------------------------

function DocSidebar({
  title,
  onTitleChange,
  sheetCount,
  layoutId,
}: {
  title: string
  onTitleChange: (v: string) => void
  sheetCount: number
  layoutId: string
}) {
  return (
    <LeftPanel
      title={title}
      onTitleChange={onTitleChange}
      sheetCount={sheetCount}
      layoutId={layoutId}
    />
  )
}

// ---------------------------------------------------------------------------
// EditorLayout
// ---------------------------------------------------------------------------

export function EditorLayout() {
  const [title, setTitle] = useState("Untitled Document")
  const [sheets, setSheets] = useState<SheetSummary[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  // Ref to the scrollable center panel (owns the editor's overflow-auto)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // We need a handle to the Tiptap editor to call addSheet / removeCurrentSheet.
  // SheetEditor exposes its editor via EditorContext; to avoid prop drilling we
  // keep a lightweight ref updated via the onSheetsChange callback side-channel.
  // For direct commands we grab the editor from the DOM via a data attribute —
  // a simpler v1 approach than useImperativeHandle.
  // Instead, we'll pass command callbacks down through SheetEditor props.
  const editorCommandsRef = useRef<{
    addSheet: () => void
    removeCurrentSheet: () => void
  } | null>(null)

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
  }, [sheets.length]) // re-bind when sheet count changes

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
  // Sheet commands — surfaced via a small callback ref
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
        />
      </div>

      {/* ── Centre: editor ─────────────────────────────────── */}
      <div className="editor-layout__center">
        <SheetEditor
          scrollContainerRef={scrollContainerRef as React.RefObject<HTMLDivElement>}
          onSheetsChange={setSheets}
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
