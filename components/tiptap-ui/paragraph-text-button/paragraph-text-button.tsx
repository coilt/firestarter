"use client"

import { forwardRef, useCallback } from "react"

// --- Tiptap UI ---
import type { UseParagraphTextConfig } from "./use-paragraph-text"
import { useParagraphText } from "./use-paragraph-text"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"

export interface ParagraphTextButtonProps
  extends Omit<ButtonProps, "type">,
    UseParagraphTextConfig {
  text?: string
}

export const ParagraphTextButton = forwardRef<
  HTMLButtonElement,
  ParagraphTextButtonProps
>(
  (
    {
      editor: providedEditor,
      text,
      hideWhenUnavailable = false,
      onToggled,
      onClick,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const { isVisible, canSet, isActive, handleSet, label, Icon } =
      useParagraphText({ editor: providedEditor, hideWhenUnavailable, onToggled })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        handleSet()
      },
      [handleSet, onClick]
    )

    if (!isVisible) return null

    return (
      <Button
        type="button"
        variant="ghost"
        data-active-state={isActive ? "on" : "off"}
        role="button"
        tabIndex={-1}
        disabled={!canSet}
        data-disabled={!canSet}
        aria-label={label}
        aria-pressed={isActive}
        tooltip={label}
        onClick={handleClick}
        {...buttonProps}
        ref={ref}
      >
        {children ?? (
          <>
            <Icon className="tiptap-button-icon" />
            {text && <span className="tiptap-button-text">{text}</span>}
          </>
        )}
      </Button>
    )
  }
)

ParagraphTextButton.displayName = "ParagraphTextButton"
