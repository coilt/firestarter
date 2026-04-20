/**
 * Thin client for the Penpot RPC API.
 *
 * Penpot's backend is Clojure, so the wire format uses kebab-case keys.
 * This module keeps all that at the boundary — callers use camelCase types.
 *
 * Mutations (create/update) → POST with JSON body.
 * Queries  (get/list)       → GET with query-string params.
 */

const BASE_URL = (process.env.PENPOT_BASE_URL ?? "https://design.penpot.app").replace(/\/$/, "")
const ACCESS_TOKEN = process.env.PENPOT_ACCESS_TOKEN ?? ""

function endpoint(command: string) {
  return `${BASE_URL}/api/rpc/command/${command}`
}

function authHeaders() {
  return {
    "Authorization": `Token ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  }
}

async function post<T>(command: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(endpoint(command), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Penpot POST /${command} → ${res.status}: ${text}`)
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

async function get<T>(command: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(endpoint(command))
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: authHeaders(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Penpot GET /${command} → ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PenpotProfile {
  id: string
  email: string
  fullname: string
  defaultTeamId: string
}

export interface PenpotProject {
  id: string
  name: string
  teamId: string
}

export interface PenpotComponent {
  id: string
  name: string
  path: string                   // folder prefix, e.g. "Benchmark" for "Benchmark/Hero"
  mainInstanceId?: string    // UUID of the main component frame in the page
  mainInstancePage?: string  // UUID of the page where the main component lives
}

export interface PenpotFile {
  id: string
  name: string
  revn: number
  vern: number
  data: {
    id: string
    pages: string[]           // ordered page UUIDs
    pagesIndex: Record<string, PenpotPage>
    components?: Record<string, PenpotComponent>   // present in library files
  }
}

export interface PenpotPage {
  id: string
  name: string
  objects: Record<string, PenpotObject>
}

export interface PenpotObject {
  id: string
  name: string
  type: "frame" | "text" | "rect" | "group" | "path"
  x: number
  y: number
  width: number
  height: number
  parentId?: string
  frameId?: string
  // Set on component instances
  componentId?: string
  componentFile?: string
  componentRoot?: boolean
}

export interface PenpotFileSummary {
  id: string
  name: string
}

/** A single change operation sent in update-file. */
export type ChangeOp =
  | {
      type: "add-obj"
      id: string
      "page-id": string
      "parent-id": string
      "frame-id": string
      obj: Record<string, unknown>
    }
  | {
      type: "mod-obj"
      id: string
      "page-id": string
      operations: Array<{ type: "set"; attr: string; val: unknown }>
    }
  | {
      type: "del-obj"
      id: string
      "page-id": string
    }
  | {
      type: "add-component"
      id: string
      name: string
      path: string
      "main-instance-id": string
      "main-instance-page": string
    }
  | {
      type: "del-component"
      id: string
    }

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/** Verify that credentials are valid. */
export function getProfile() {
  // Use POST — GET is blocked by Cloudflare on design.penpot.app
  return post<PenpotProfile>("get-profile", {})
}

/** List all projects for a team. */
export function getTeamProjects(teamId: string) {
  return post<PenpotProject[]>("get-team-projects", { "team-id": teamId })
}

/** Create a new project inside a team. */
export function createProject(teamId: string, name: string) {
  return post<PenpotProject>("create-project", { "team-id": teamId, name })
}

/**
 * Create a new Penpot file inside a project.
 * Returns the full file object including the initial page UUID.
 */
export function createFile(projectId: string, name: string) {
  return post<PenpotFile>("create-file", {
    "project-id": projectId,
    name,
    "is-shared": false,
  })
}

// Features our client declares support for — required by Penpot 2.x+
const SUPPORTED_FEATURES = [
  "fdata/path-data",
  "design-tokens/v1",
  "variants/v1",
  "layout/grid",
  "components/v2",
  "fdata/shape-data-type",
]

/** Fetch a file's full data (includes page objects + current revn). */
export function getFile(fileId: string) {
  // POST so we can send features as a proper JSON array (GET query strings
  // can't express arrays in a way Penpot's parser accepts).
  return post<PenpotFile>("get-file", {
    id: fileId,
    features: SUPPORTED_FEATURES,
  })
}

/**
 * Apply a list of change operations to a file.
 * `revn` must match the file's current revision — fetch the file first.
 * `sessionId` is an arbitrary UUID that groups changes from one client session.
 */
export function updateFile(
  fileId: string,
  revn: number,
  vern: number,
  sessionId: string,
  changes: ChangeOp[]
) {
  return post<{ id: string; revn: number }>("update-file", {
    id: fileId,
    revn,
    vern,
    "session-id": sessionId,
    features: SUPPORTED_FEATURES,
    changes,
  })
}

/** Mark a file as a shared library so other files can link to it. */
export function setFileShared(fileId: string) {
  return post<void>("set-file-shared", {
    id: fileId,
    "is-shared": true,
  })
}

/** Link an external shared library file to a file so component references are valid. */
export function linkFileToLibrary(fileId: string, libraryId: string) {
  return post<void>("link-file-to-library", {
    "file-id": fileId,
    "library-id": libraryId,
  })
}

/** List all files in a project (summaries only, no page data). */
export function getProjectFiles(projectId: string) {
  return post<PenpotFileSummary[]>("get-project-files", { "project-id": projectId })
}

/** Delete a file. Non-fatal if the file no longer exists. */
export function deleteFile(fileId: string) {
  return post<void>("delete-file", { id: fileId })
}

/** The zero UUID — Penpot uses this as the root frame ID of every page. */
export const ROOT_FRAME_ID = "00000000-0000-0000-0000-000000000000"
