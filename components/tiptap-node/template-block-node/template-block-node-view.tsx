"use client"

import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"
import { useState } from "react"
import type { NodeViewProps } from "@tiptap/react"

export function TemplateBlockNodeView({ node }: NodeViewProps) {
  const { componentId, componentName, componentPath } = node.attrs as {
    componentId: string
    componentName: string
    componentPath: string
  }

  const [previewFailed, setPreviewFailed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const label = componentPath ? `${componentPath} / ${componentName}` : componentName

  return (
    <NodeViewWrapper
      as="div"
      className="template-block-node"
      data-component-name={componentName}
      data-component-path={componentPath}
      data-component-id={componentId}
    >
      <div className="template-block-inner">
        <div className="template-block-header">
          <span className="template-block-label">{label}</span>
          {componentId && !previewFailed && (
            <button
              className="template-block-toggle"
              onClick={() => setCollapsed((c) => !c)}
              contentEditable={false}
              title={collapsed ? "Show preview" : "Hide preview"}
            >
              {collapsed ? "▸ Preview" : "▾ Preview"}
            </button>
          )}
        </div>

        {componentId && !previewFailed && !collapsed && (
          <div className="template-block-canvas" contentEditable={false}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/penpot/components/${componentId}/preview`}
              alt={componentName}
              onError={() => setPreviewFailed(true)}
              className="template-block-svg"
            />
          </div>
        )}

        <div className="template-block-content-header" contentEditable={false}>
          Content
        </div>
        <NodeViewContent as="div" className="template-block-content" />
      </div>
    </NodeViewWrapper>
  )
}
