/**
 * Render a Penpot shape subtree as an SVG string.
 *
 * Uses the full shape data returned by get-file (with fdata/path-data and
 * fdata/shape-data-type features) to produce a close approximation of the
 * actual design — real colors, actual text content, vector paths.
 *
 * Images are proxied through /api/penpot/media/[id] when we can identify them.
 */

// ---------------------------------------------------------------------------
// Fill helpers
// ---------------------------------------------------------------------------

type Fill = {
  fillColor?: string
  fillOpacity?: number
  fillType?: string
  fillImage?: { id?: string; width?: number; height?: number; mtype?: string }
  fillColorGradient?: unknown
  // kebab-case fallback
  "fill-color"?: string
  "fill-opacity"?: number
  "fill-type"?: string
}

function solidFill(fills: Fill[] | undefined): { color: string; opacity: number } {
  if (!fills?.length) return { color: "none", opacity: 1 }
  const f = fills[0]
  if (f.fillImage || f["fill-type"] === "image" || f.fillType === "image") {
    return { color: "#E2E8F0", opacity: 1 }
  }
  if (f.fillColorGradient || f["fill-type"] === "gradient" || f.fillType === "gradient") {
    return { color: "#CBD5E1", opacity: 1 }
  }
  const color = f.fillColor ?? f["fill-color"] ?? "none"
  if (color === "none") return { color: "none", opacity: 1 }
  const opacity = f.fillOpacity ?? f["fill-opacity"] ?? 1
  return { color, opacity }
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

interface TextNode {
  type?: string
  text?: string
  children?: TextNode[]
  fontSize?: string
  fontWeight?: string
  lineHeight?: string | number
  fillColor?: string
  fills?: Fill[]
  fontStyle?: string
  textDecoration?: string
}

interface TextParagraph {
  runs: Array<{ text: string; fontSize: number; color: string; bold: boolean }>
  fontSize: number
  lineHeight: number
}

/** Walk the content tree and return one entry per paragraph node. */
function extractParagraphs(node: TextNode): TextParagraph[] {
  if (node.type === "paragraph") {
    const runs: TextParagraph["runs"] = []
    function collectRuns(n: TextNode) {
      if (typeof n.text === "string") {
        const { color } = solidFill(n.fills ?? (n.fillColor ? [{ fillColor: n.fillColor }] : undefined))
        runs.push({
          text: n.text,
          fontSize: parseFloat(n.fontSize ?? "14"),
          color: color !== "none" ? color : "#111111",
          bold: (n.fontWeight ?? "400") >= "600",
        })
        return
      }
      for (const child of n.children ?? []) collectRuns(child)
    }
    collectRuns(node)
    const fs = parseFloat(node.fontSize ?? runs[0]?.fontSize?.toString() ?? "14")
    const lh = parseFloat(String(node.lineHeight ?? "1.2"))
    return [{ runs, fontSize: fs, lineHeight: lh }]
  }
  return (node.children ?? []).flatMap(extractParagraphs)
}

// ---------------------------------------------------------------------------
// Path data conversion
// ---------------------------------------------------------------------------

interface PathSegment {
  command: string   // "M" | "L" | "C" | "Q" | "Z" | "A" etc.
  params?: Record<string, number>
}

function segmentsToD(segments: PathSegment[]): string {
  return segments.map((s) => {
    const p = s.params ?? {}
    switch (s.command) {
      case "M": return `M ${p.x} ${p.y}`
      case "L": return `L ${p.x} ${p.y}`
      case "C": return `C ${p.c1x} ${p.c1y} ${p.c2x} ${p.c2y} ${p.x} ${p.y}`
      case "Q": return `Q ${p.cx} ${p.cy} ${p.x} ${p.y}`
      case "Z": return "Z"
      case "A": return `A ${p.rx} ${p.ry} ${p.xAxisRotation ?? 0} ${p.largeArcFlag ?? 0} ${p.sweepFlag ?? 0} ${p.x} ${p.y}`
      default: return ""
    }
  }).filter(Boolean).join(" ")
}

// ---------------------------------------------------------------------------
// SVG attribute helpers
// ---------------------------------------------------------------------------

function n(v: number) { return v.toFixed(2) }
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

interface RawShape {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  fills?: Fill[]
  strokes?: Array<{ strokeColor?: string; strokeOpacity?: number; strokeWidth?: number }>
  r1?: number; r2?: number; r3?: number; r4?: number
  parentId?: string
  shapes?: string[]
  content?: unknown     // text content tree OR path segments array
  transform?: { a: number; b: number; c: number; d: number; e: number; f: number }
  clipContent?: boolean
  opacity?: number
}

export function renderShapePreview(
  objects: Record<string, unknown>,
  rootId: string,
): string {
  const root = objects[rootId] as RawShape | undefined
  if (!root) return ""

  const W = root.width
  const H = root.height
  const offX = root.x
  const offY = root.y

  const parts: string[] = []
  let defCount = 0

  // Build children index from `shapes` arrays (authoritative ordering)
  const childrenOf = new Map<string, string[]>()
  for (const raw of Object.values(objects)) {
    const obj = raw as RawShape
    if (Array.isArray(obj.shapes) && obj.shapes.length) {
      childrenOf.set(obj.id, obj.shapes)
    }
  }

  function renderNode(id: string, depth: number) {
    if (depth > 20) return
    const obj = objects[id] as RawShape | undefined
    if (!obj) return

    const x = obj.x - offX
    const y = obj.y - offY
    const w = obj.width
    const h = obj.height
    // Cull shapes clearly outside the root viewport
    if (x + w < -10 || y + h < -10 || x > W + 10 || y > H + 10) return

    const { color: fill, opacity: fillOpacity } = solidFill(obj.fills)
    const rx = obj.r1 ?? 0
    const opacity = obj.opacity ?? 1

    // Transform attribute
    const t = obj.transform
    const tfStr = t && (t.b !== 0 || t.c !== 0 || t.a !== 1 || t.d !== 1)
      ? ` transform="matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e - offX} ${t.f - offY})"`
      : ""

    const opacityAttr = opacity < 1 ? ` opacity="${n(opacity)}"` : ""

    if (obj.type === "frame") {
      const bgFillAttr = fill !== "none"
        ? ` fill="${esc(fill)}" fill-opacity="${fillOpacity}"`
        : ` fill="white"`

      if (obj.clipContent !== false) {
        // Clipped frame: wrap in a <g> with clipPath
        const clipId = `c${++defCount}`
        parts.push(`<defs><clipPath id="${clipId}"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${rx}"/></clipPath></defs>`)
        parts.push(`<g clip-path="url(#${clipId})"${opacityAttr}>`)
        parts.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${bgFillAttr}/>`)
        for (const childId of childrenOf.get(id) ?? []) renderNode(childId, depth + 1)
        parts.push(`</g>`)
      } else {
        parts.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${bgFillAttr}/>`)
        for (const childId of childrenOf.get(id) ?? []) renderNode(childId, depth + 1)
      }
      return
    }

    if (obj.type === "rect") {
      if (fill === "none") return
      parts.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${esc(fill)}" fill-opacity="${fillOpacity}" rx="${rx}"${opacityAttr}/>`)
      return
    }

    if (obj.type === "circle") {
      if (fill === "none") return
      parts.push(`<ellipse cx="${n(x + w / 2)}" cy="${n(y + h / 2)}" rx="${n(w / 2)}" ry="${n(h / 2)}" fill="${esc(fill)}" fill-opacity="${fillOpacity}"${opacityAttr}/>`)
      return
    }

    if (obj.type === "text") {
      const content = obj.content as TextNode | undefined
      if (!content) return
      const paras = extractParagraphs(content)
      if (!paras.length) return

      const firstNonEmpty = paras.find(p => p.runs.some(r => r.text !== ""))
      if (!firstNonEmpty) return

      // Clip text to the shape's bounding box so it doesn't overflow
      const clipId = `tc${++defCount}`
      parts.push(`<defs><clipPath id="${clipId}"><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"/></clipPath></defs>`)

      // Baseline of first line ≈ shape top + font ascent (≈ 0.8 × fontSize)
      let curY = y + firstNonEmpty.fontSize * 0.8

      for (const para of paras) {
        const isEmpty = para.runs.every(r => r.text === "")
        const lineAdvance = para.fontSize * para.lineHeight

        if (isEmpty) {
          curY += lineAdvance
          continue
        }

        const fSize = para.fontSize
        const fColor = para.runs[0].color
        const fWeight = para.runs[0].bold ? "bold" : "normal"
        const lineText = para.runs.map(r => r.text).join("")

        if (lineText.trim()) {
          parts.push(
            `<text x="${n(x)}" y="${n(curY)}" font-size="${fSize}" font-weight="${fWeight}" fill="${esc(fColor)}" clip-path="url(#${clipId})" xml:space="preserve">${esc(lineText)}</text>`,
          )
        }
        curY += lineAdvance
      }
      return
    }

    if (obj.type === "path" || obj.type === "bool") {
      // content is an array of path segments when fdata/path-data is declared
      const segs = Array.isArray(obj.content) ? obj.content as PathSegment[] : null
      if (segs?.length) {
        // Path uses absolute coordinates — translate by offset
        const d = segmentsToD(segs)
        const fillAttr = fill !== "none" ? ` fill="${esc(fill)}" fill-opacity="${fillOpacity}"` : ` fill="none"`
        parts.push(`<path d="${d}" transform="translate(${n(-offX)},${n(-offY)})"${fillAttr}${opacityAttr}/>`)
      } else if (fill !== "none") {
        parts.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${esc(fill)}" rx="${rx}"/>`)
      }
      return
    }

    if (obj.type === "image") {
      // Show a placeholder tint — images need external storage access
      parts.push(`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#E2E8F0" rx="${rx}"/>`)
      return
    }

    if (obj.type === "group" || obj.type === "svg-raw") {
      parts.push(`<g${opacityAttr}>`)
      for (const childId of childrenOf.get(id) ?? []) renderNode(childId, depth + 1)
      parts.push(`</g>`)
      return
    }
  }

  // Root background
  const { color: rootFill, opacity: rootFillOpacity } = solidFill(root.fills)
  parts.push(`<rect x="0" y="0" width="${n(W)}" height="${n(H)}" fill="${rootFill !== "none" ? esc(rootFill) : "white"}" fill-opacity="${rootFillOpacity}"/>`)

  for (const childId of childrenOf.get(rootId) ?? []) {
    renderNode(childId, 0)
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(W)} ${n(H)}">`,
    ...parts,
    `</svg>`,
  ].join("")
}
