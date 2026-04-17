"use client"

import { useCallback, useEffect, useState } from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { PilcrowIcon } from "@/components/tiptap-icons/pilcrow-icon"

export interface UseParagraphTextConfig {
  editor?: Editor | null
  hideWhenUnavailable?: boolean
  onToggled?: () => void
}

export function useParagraphText(config: UseParagraphTextConfig = {}) {
  const { editor: providedEditor, hideWhenUnavailable = false, onToggled } = config

  const { editor } = useTiptapEditor(providedEditor)
  const [isVisible, setIsVisible] = useState(true)

  const isActive = editor?.isActive("paragraph") ?? false
  const canSet =
    !!editor && editor.isEditable && editor.can().setParagraph()

  useEffect(() => {
    if (!editor) return

    const update = () => {
      if (!hideWhenUnavailable) {
        setIsVisible(true)
        return
      }
      setIsVisible(!!editor.isEditable && editor.can().setParagraph())
    }

    update()
    editor.on("selectionUpdate", update)
    return () => { editor.off("selectionUpdate", update) }
  }, [editor, hideWhenUnavailable])

  const handleSet = useCallback(() => {
    if (!editor) return false
    const success = editor.chain().focus().setParagraph().run()
    if (success) onToggled?.()
    return success
  }, [editor, onToggled])

  return {
    isVisible,
    isActive,
    canSet,
    handleSet,
    label: "Paragraph",
    Icon: PilcrowIcon,
  }
}
