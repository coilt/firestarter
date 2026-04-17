/**
 * GET /api/penpot/templates
 *
 * Lists all files in the Penpot Templates project.
 * Each file is a document template (e.g. "BenchmarkReport").
 * Requires PENPOT_TEMPLATES_PROJECT_ID in env.
 */

import { getProjectFiles } from "@/lib/penpot"

export async function GET() {
  const projectId = process.env.PENPOT_TEMPLATES_PROJECT_ID
  if (!projectId) {
    return Response.json(
      { error: "PENPOT_TEMPLATES_PROJECT_ID is not configured" },
      { status: 503 }
    )
  }

  try {
    const files = await getProjectFiles(projectId)
    return Response.json(
      files.map((f) => ({ id: f.id, name: f.name }))
    )
  } catch (err) {
    console.error("[penpot/templates] failed:", err)
    return Response.json({ error: "Failed to fetch templates" }, { status: 500 })
  }
}
