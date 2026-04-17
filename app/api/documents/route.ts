import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  const documents = await prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
  })
  return NextResponse.json(documents)
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

  return NextResponse.json(document, { status: 201 })
}
