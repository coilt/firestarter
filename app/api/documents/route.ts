import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getProfile, getTeamProjects, createProject, createFile } from "@/lib/penpot"
import { syncToPenpot } from "@/lib/penpot-sync"

export async function GET() {
  const documents = await prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(documents)
}

/**
 * Find the Penpot project named after the profile owner, or create it.
 * Falls back to PENPOT_PROJECT_ID if the Penpot API calls fail.
 */
async function resolveProjectId(): Promise<string | null> {
  const fallback = process.env.PENPOT_PROJECT_ID ?? null

  try {
    const profile = await getProfile()
    const teamId = profile.defaultTeamId

    const projects = await getTeamProjects(teamId)
    const existing = projects.find((p) => p.name === profile.fullname)
    if (existing) return existing.id

    const created = await createProject(teamId, profile.fullname)
    return created.id
  } catch (err) {
    console.error("[penpot] resolveProjectId failed, using fallback:", err)
    return fallback
  }
}

export async function POST(request: Request) {
  const body = await request.json()

  if (!body?.title || !body?.content) {
    return NextResponse.json(
      { error: "title and content are required" },
      { status: 400 }
    )
  }

  const document = await prisma.document.create({
    data: {
      title: body.title,
      templateId: body.templateId ?? "default",
      content: body.content,
    },
  })

  // Create matching Penpot file in the owner's project folder, then sync content.
  const token = process.env.PENPOT_ACCESS_TOKEN
  if (token) {
    try {
      const projectId = await resolveProjectId()
      if (projectId) {
        const penpotFile = await createFile(projectId, document.title)

        // Store the Penpot file ID so syncToPenpot uses it on the getFile path
        const withPenpotId = await prisma.document.update({
          where: { id: document.id },
          data: { penpotFileId: penpotFile.id },
        })

        // Sync initial content so the Penpot file isn't empty
        await syncToPenpot(withPenpotId)

        return NextResponse.json(withPenpotId, { status: 201 })
      }
    } catch (err) {
      console.error("[penpot] failed to create/sync file for new document:", err)
    }
  }

  return NextResponse.json(document, { status: 201 })
}
