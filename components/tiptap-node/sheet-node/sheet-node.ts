import { Node, mergeAttributes } from "@tiptap/core"

export interface SheetOptions {
  /**
   * The height of each sheet in pixels. Matches A4 at 96 dpi by default.
   * Content that exceeds this height is still visible but overflows visually,
   * giving the writer a clear cue to move content to the next sheet.
   * @default 1122
   */
  height: number

  /**
   * The width of each sheet in pixels. Matches A4 at 96 dpi by default.
   * @default 794
   */
  width: number

  /**
   * HTML attributes to add to the rendered sheet element.
   */
  HTMLAttributes: Record<string, unknown>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sheet: {
      /**
       * Append a new empty sheet at the end of the document.
       */
      addSheet: (attrs?: Partial<SheetAttrs>) => ReturnType

      /**
       * Remove the sheet that contains the current selection.
       */
      removeCurrentSheet: () => ReturnType
    }
  }
}

export interface SheetAttrs {
  /**
   * Zero-based sheet index. Used to order sheets in the API output.
   */
  index: number

  /**
   * Maps to a Figma frame component key and — in post-v1 — to a document
   * template layout preset. Defaults to single-column.
   */
  layoutId: string
}

export const Sheet = Node.create<SheetOptions>({
  name: "sheet",

  group: "block",

  content: "block+",

  defining: true,

  isolating: true,

  addOptions() {
    return {
      height: 1122,
      width: 794,
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      index: {
        default: 0,
        parseHTML: (el) => parseInt(el.getAttribute("data-index") ?? "0", 10),
        renderHTML: (attrs) => ({ "data-index": attrs.index }),
      },
      layoutId: {
        default: "single-column",
        parseHTML: (el) => el.getAttribute("data-layout-id") ?? "single-column",
        renderHTML: (attrs) => ({ "data-layout-id": attrs.layoutId }),
      },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-type='sheet']" }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "sheet",
        class: "sheet-node",
        style: `--sheet-height: ${this.options.height}px; --sheet-width: ${this.options.width}px;`,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      addSheet:
        (attrs = {}) =>
        ({ state, dispatch }) => {
          const { tr, doc } = state

          // Count existing sheets to auto-assign the next index
          let sheetCount = 0
          doc.forEach((node) => {
            if (node.type.name === "sheet") sheetCount++
          })

          const sheetType = state.schema.nodes.sheet
          const paragraphType = state.schema.nodes.paragraph

          if (!sheetType || !paragraphType) return false

          const newSheet = sheetType.create(
            { index: sheetCount, layoutId: "single-column", ...attrs },
            [paragraphType.create()]
          )

          if (dispatch) {
            tr.insert(doc.content.size, newSheet)
            dispatch(tr.scrollIntoView())
          }

          return true
        },

      removeCurrentSheet:
        () =>
        ({ state, dispatch }) => {
          const { tr, selection, doc } = state
          let sheetStart = -1
          let sheetEnd = -1

          // Find the sheet node that contains the cursor
          doc.forEach((node, offset) => {
            if (node.type.name === "sheet") {
              const nodeStart = offset
              const nodeEnd = offset + node.nodeSize
              if (
                selection.from >= nodeStart &&
                selection.to <= nodeEnd
              ) {
                sheetStart = nodeStart
                sheetEnd = nodeEnd
              }
            }
          })

          if (sheetStart === -1) return false

          // Prevent removing the last remaining sheet
          let sheetCount = 0
          doc.forEach((node) => {
            if (node.type.name === "sheet") sheetCount++
          })
          if (sheetCount <= 1) return false

          if (dispatch) {
            dispatch(tr.delete(sheetStart, sheetEnd))
          }

          return true
        },
    }
  },
})
