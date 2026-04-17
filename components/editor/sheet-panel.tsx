"use client"

import clsx from "clsx"
import type { SheetSummary } from "@/components/editor/sheet-editor"
import { TemplatePicker, useComponentCatalog, type InsertableComponent } from "@/components/editor/template-picker"

// ---------------------------------------------------------------------------
// Layout badge label map
// ---------------------------------------------------------------------------
const LAYOUT_LABELS: Record<string, string> = {
  "single-column": "1 col",
  "two-columns": "2 col",
  "three-columns-table": "3 col + table",
  "hero-image-left": "hero",
  cover: "cover",
}

// ---------------------------------------------------------------------------
// Mini page thumbnail
// ---------------------------------------------------------------------------
function SheetThumbnail({
  sheet,
  active,
  onClick,
}: {
  sheet: SheetSummary
  active: boolean
  onClick: () => void
}) {
  const label = LAYOUT_LABELS[sheet.layoutId] ?? sheet.layoutId

  // Simulate "content lines" from the preview text
  const words = sheet.preview.trim().split(/\s+/).filter(Boolean)
  // First chunk = heading-like line, rest = body lines
  const headingWords = words.slice(0, 4).join(" ")
  const bodyText = words.slice(4).join(" ")

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "sheet-thumb group",
        active && "sheet-thumb--active"
      )}
      aria-label={`Go to sheet ${sheet.index + 1}`}
      aria-current={active ? "true" : undefined}
    >
      {/* Mini page */}
      <div className="sheet-thumb__page">
        {/* Heading line */}
        {headingWords && (
          <div className="sheet-thumb__heading">{headingWords}</div>
        )}
        {/* Body lines */}
        {bodyText && (
          <div className="sheet-thumb__body">{bodyText}</div>
        )}
        {/* Ghost lines when no content */}
        {!sheet.preview && (
          <>
            <div className="sheet-thumb__ghost sheet-thumb__ghost--wide" />
            <div className="sheet-thumb__ghost sheet-thumb__ghost--med" />
            <div className="sheet-thumb__ghost sheet-thumb__ghost--short" />
          </>
        )}
      </div>

      {/* Footer: number + layout */}
      <div className="sheet-thumb__meta">
        <span className="sheet-thumb__number">{sheet.index + 1}</span>
        <span className="sheet-thumb__layout">{label}</span>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// SheetPanel
// ---------------------------------------------------------------------------

interface SheetPanelProps {
  sheets: SheetSummary[]
  activeIndex: number
  onSheetClick: (index: number) => void
  onAddSheet: () => void
  onRemoveSheet: () => void
  canRemove: boolean
  onInsertBlock: (comp: InsertableComponent) => void
}

export function SheetPanel({
  sheets,
  activeIndex,
  onSheetClick,
  onAddSheet,
  onRemoveSheet,
  canRemove,
  onInsertBlock,
}: SheetPanelProps) {
  const { catalog, loading } = useComponentCatalog()
  return (
    <aside className="sheet-panel">
      <div className="sheet-panel__header">
        <span className="sheet-panel__title">Sheets</span>
        <span className="sheet-panel__count">{sheets.length}</span>
      </div>

      <div className="sheet-panel__list">
        {sheets.map((sheet) => (
          <SheetThumbnail
            key={sheet.index}
            sheet={sheet}
            active={sheet.index === activeIndex}
            onClick={() => onSheetClick(sheet.index)}
          />
        ))}
      </div>

      <div className="sheet-panel__templates">
        <p className="sheet-panel__templates-heading">Sheet template</p>
        <TemplatePicker
          catalog={catalog}
          loading={loading}
          onInsert={onInsertBlock}
        />
      </div>

      <div className="sheet-panel__actions">
        <button
          type="button"
          className="sheet-panel__btn sheet-panel__btn--add"
          onClick={onAddSheet}
          aria-label="Add sheet"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 1v10M1 6h10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Add sheet
        </button>

        {canRemove && (
          <button
            type="button"
            className="sheet-panel__btn sheet-panel__btn--remove"
            onClick={onRemoveSheet}
            aria-label="Remove current sheet"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 6h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Remove
          </button>
        )}
      </div>
    </aside>
  )
}
