import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { TemplateBlockNodeView } from "./template-block-node-view"

export interface TemplateBlockAttrs {
  componentId: string
  componentPath: string  // e.g. "Benchmarks/Hero"
  componentName: string  // e.g. "Hero"
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    templateBlock: {
      /**
       * Insert a template block at the current selection.
       * Content is seeded with an empty paragraph.
       */
      insertTemplateBlock: (attrs: TemplateBlockAttrs) => ReturnType
    }
  }
}

export const TemplateBlock = Node.create({
  name: "templateBlock",

  group: "block",

  content: "block+",

  defining: true,

  isolating: true,

  addAttributes() {
    return {
      componentId: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-component-id") ?? "",
        renderHTML: (attrs) => ({ "data-component-id": attrs.componentId }),
      },
      componentPath: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-component-path") ?? "",
        renderHTML: (attrs) => ({ "data-component-path": attrs.componentPath }),
      },
      componentName: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-component-name") ?? "",
        renderHTML: (attrs) => ({ "data-component-name": attrs.componentName }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-type='template-block']" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "template-block",
        class: "template-block-node",
      }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TemplateBlockNodeView)
  },

  addCommands() {
    return {
      insertTemplateBlock:
        (attrs: TemplateBlockAttrs) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: "templateBlock",
              attrs,
              content: [{ type: "paragraph" }],
            })
            .run()
        },
    }
  },
})
