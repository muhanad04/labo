import { z } from 'zod'
import { decodeProject, LEGACY_STORAGE_KEY, PREVIOUS_STORAGE_KEY, V2_STORAGE_KEY, RECOVERY_KEY } from './project'
import type { ProjectFile } from './project'

export const LIBRARY_KEY = 'labo.library.v3'
export const PREVIOUS_LIBRARY_KEY = 'labo.library.v2'
export const LEGACY_LIBRARY_KEY = 'labo.library.v1'
export interface SavedProject {
  id: string
  name: string
  savedAt: string
  file: ProjectFile
}
const schema = z
  .object({
    version: z.literal(1),
    entries: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            name: z.string().trim().min(1).max(80),
            savedAt: z.iso.datetime(),
            file: z.unknown(),
          })
          .strict(),
      )
      .max(8),
  })
  .strict()

export function readLibrary(): SavedProject[] {
  const text = localStorage.getItem(LIBRARY_KEY) ?? localStorage.getItem(PREVIOUS_LIBRARY_KEY) ?? localStorage.getItem(LEGACY_LIBRARY_KEY)
  if (!text) return []
  if (text.length > 2_000_000)
    throw new Error('Project library exceeds its limit. Existing data is unchanged.')
  const parsed = schema.safeParse(JSON.parse(text))
  if (!parsed.success) throw new Error('Project library is unreadable. Existing data is unchanged.')
  const entries = parsed.data.entries.map((e) => ({
    ...e,
    file: decodeProject(JSON.stringify(e.file)),
  }))
  if (
    new Set(entries.map((e) => e.id)).size !== entries.length ||
    new Set(entries.map((e) => e.name)).size !== entries.length
  )
    throw new Error('Project library contains duplicate entries.')
  return entries
}
function write(entries: SavedProject[]) {
  const json = JSON.stringify({ version: 1, entries })
  if (json.length > 2_000_000)
    throw new Error('Library limit: 2 MB. Export/delete a saved project first.')
  // One atomic key write; quota failure cannot partially replace the catalog.
  localStorage.setItem(LIBRARY_KEY, json)
}
export function putNamed(name: string, file: ProjectFile, replaceId?: string): SavedProject[] {
  const clean = name.trim()
  if (!clean || clean.length > 80) throw new Error('Project name must be 1–80 characters.')
  const checked = decodeProject(JSON.stringify(file)),
    entries = readLibrary()
  if (entries.some((e) => e.name === clean && e.id !== replaceId))
    throw new Error('A project with this name already exists.')
  if (replaceId && !entries.some((e) => e.id === replaceId))
    throw new Error('Saved project no longer exists.')
  if (!replaceId && entries.length >= 8)
    throw new Error('Library limit: 8 projects. Export/delete an entry first.')
  const entry: SavedProject = {
    id: replaceId ?? crypto.randomUUID(),
    name: clean,
    savedAt: new Date().toISOString(),
    file: checked,
  }
  const next = replaceId
    ? entries.map((e) => (e.id === replaceId ? entry : e))
    : [...entries, entry]
  write(next)
  return next
}
export function deleteNamed(id: string): SavedProject[] {
  const entries = readLibrary().filter((e) => e.id !== id)
  write(entries)
  return entries
}
export function readRecovery(): ProjectFile | null {
  const text =
    localStorage.getItem(RECOVERY_KEY) ??
    localStorage.getItem(PREVIOUS_STORAGE_KEY) ??
    localStorage.getItem('labo.project.v3.previous') ??
    localStorage.getItem(V2_STORAGE_KEY) ??
    localStorage.getItem('labo.project.v2.previous') ??
    localStorage.getItem(LEGACY_STORAGE_KEY)
  return text ? decodeProject(text) : null
}
