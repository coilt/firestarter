"use client"

import { useRef, useState } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import type { Content } from "@tiptap/core"
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"

// Sheet node
import { Sheet } from "@/components/tiptap-node/sheet-node/sheet-node"
import "@/components/tiptap-node/sheet-node/sheet-node.scss"

// Tiptap UI primitives
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// Tiptap node styles
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// Tiptap node extensions
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"

// Tiptap UI
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ParagraphTextButton } from "@/components/tiptap-ui/paragraph-text-button"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

// Icons
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"

// Hooks
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"

// Theme toggle
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle"

// Lib
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"

// Simple editor base styles (fonts, scrollbars, prose)
import "@/components/tiptap-templates/simple/simple-editor.scss"

export interface SheetSummary {
  index: number
  layoutId: string
  /** First ~80 characters of text content in the sheet */
  preview: string
}

export interface EditorCommands {
  addSheet: () => void
  removeCurrentSheet: () => void
  getContent: () => ReturnType<NonNullable<ReturnType<typeof useEditor>>["getJSON"]>
}

interface SheetEditorProps {
  /** Called whenever sheet structure changes (content update) */
  onSheetsChange?: (sheets: SheetSummary[]) => void
  /** Ref forwarded to the scrollable editor content area */
  scrollContainerRef?: React.RefObject<HTMLDivElement>
  /** Called once the editor is ready, providing imperative sheet commands */
  onCommandsReady?: (commands: EditorCommands) => void
  /** Initial document content (ProseMirror JSON). Defaults to INITIAL_CONTENT. */
  initialContent?: Content
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Walk a Tiptap JSON node tree and collect all text content. */
function extractText(node: Record<string, unknown>, max = 80): string {
  let text = ""

  if (node.type === "text" && typeof node.text === "string") {
    text += node.text
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content as Record<string, unknown>[]) {
      text += extractText(child, max - text.length)
      if (text.length >= max) break
    }
  }

  return text.slice(0, max)
}

function extractSheets(
  json: ReturnType<NonNullable<ReturnType<typeof useEditor>>["getJSON"]>
): SheetSummary[] {
  if (!json?.content) return []

  return (json.content as Record<string, unknown>[])
    .filter((n) => n.type === "sheet")
    .map((n, i) => {
      const attrs = (n.attrs ?? {}) as Record<string, unknown>
      return {
        index: typeof attrs.index === "number" ? attrs.index : i,
        layoutId:
          typeof attrs.layoutId === "string"
            ? attrs.layoutId
            : "single-column",
        preview: extractText(n),
      }
    })
}

// ---------------------------------------------------------------------------
// Toolbar sub-components (same pattern as simple-editor)
// ---------------------------------------------------------------------------

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
}) => (
  <>
    <Spacer />
    <ToolbarGroup>
      <UndoRedoButton action="undo" />
      <UndoRedoButton action="redo" />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <ParagraphTextButton />
      <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
      <ListDropdownMenu
        modal={false}
        types={["bulletList", "orderedList", "taskList"]}
      />
      <BlockquoteButton />
      <CodeBlockButton />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <MarkButton type="bold" />
      <MarkButton type="italic" />
      <MarkButton type="strike" />
      <MarkButton type="code" />
      <MarkButton type="underline" />
      {!isMobile ? (
        <ColorHighlightPopover />
      ) : (
        <ColorHighlightPopoverButton onClick={onHighlighterClick} />
      )}
      {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <MarkButton type="superscript" />
      <MarkButton type="subscript" />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <TextAlignButton align="left" />
      <TextAlignButton align="center" />
      <TextAlignButton align="right" />
      <TextAlignButton align="justify" />
    </ToolbarGroup>
    <ToolbarSeparator />
    <ToolbarGroup>
      <ImageUploadButton text="Add" />
    </ToolbarGroup>
    <Spacer />
    {isMobile && <ToolbarSeparator />}
    <ToolbarGroup>
      <ThemeToggle />
    </ToolbarGroup>
  </>
)

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>
    <ToolbarSeparator />
    {type === "highlighter" ? <ColorHighlightPopoverContent /> : <LinkContent />}
  </>
)

// ---------------------------------------------------------------------------
// SheetEditor
// ---------------------------------------------------------------------------

const INITIAL_CONTENT = {
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

export function SheetEditor({
  onSheetsChange,
  scrollContainerRef,
  onCommandsReady,
  initialContent,
}: SheetEditorProps) {
  const isMobile = useIsBreakpoint()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const toolbarRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Document editor",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: { openOnClick: false, enableClickSelection: true },
      }),
      Sheet,
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content: initialContent ?? INITIAL_CONTENT,
    onUpdate({ editor: e }) {
      onSheetsChange?.(extractSheets(e.getJSON()))
    },
    onCreate({ editor: e }) {
      onSheetsChange?.(extractSheets(e.getJSON()))
      onCommandsReady?.({
        addSheet: () => e.commands.addSheet(),
        removeCurrentSheet: () => e.commands.removeCurrentSheet(),
        getContent: () => e.getJSON(),
      })
    },
  })

  // When returning to desktop, always show the main toolbar — derived, not state.
  const effectiveMobileView = isMobile ? mobileView : "main"

  return (
    <EditorContext.Provider value={{ editor }}>
      {/* The scroll container wraps both toolbar and content so sticky works */}
      <div ref={scrollContainerRef} className="editor-scroll-container">
        <Toolbar ref={toolbarRef}>
          {effectiveMobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={effectiveMobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="editor-content-area"
        />
      </div>
    </EditorContext.Provider>
  )
}
