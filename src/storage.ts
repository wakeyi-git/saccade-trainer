import { openDB, type IDBPDatabase, type DBSchema } from 'idb'
import type { Paragraph, Session, Settings, Student } from './types'
import { DEFAULT_SETTINGS } from './types'
import paragraphPool from './data/paragraph-pool-default.json'

const DB_NAME = 'saccade-trainer'
const DB_VERSION = 2
const SETTINGS_KEY = 'saccade-trainer:settings'

interface SaccadeDB extends DBSchema {
  students: {
    key: string
    value: Student
    indexes: { 'by-registered': string }
  }
  sessions: {
    key: string
    value: Session
    indexes: { 'by-date': string; 'by-created': string }
  }
  paragraphs: {
    key: string
    value: Paragraph
    indexes: { 'by-created': string }
  }
}

let dbPromise: Promise<IDBPDatabase<SaccadeDB>> | null = null

function db(): Promise<IDBPDatabase<SaccadeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SaccadeDB>(DB_NAME, DB_VERSION, {
      upgrade(d, oldVersion) {
        if (oldVersion < 1) {
          const s = d.createObjectStore('students', { keyPath: 'id' })
          s.createIndex('by-registered', 'registeredAt')
          const ss = d.createObjectStore('sessions', { keyPath: 'id' })
          ss.createIndex('by-date', 'date')
          ss.createIndex('by-created', 'createdAt')
        }
        if (oldVersion < 2) {
          const p = d.createObjectStore('paragraphs', { keyPath: 'id' })
          p.createIndex('by-created', 'createdAt')
        }
      }
    })
  }
  return dbPromise
}

// === Students ===

export async function listStudents(): Promise<Student[]> {
  return (await db()).getAllFromIndex('students', 'by-registered')
}
export async function getStudent(id: string): Promise<Student | undefined> {
  return (await db()).get('students', id)
}
export async function putStudent(s: Student): Promise<void> {
  await (await db()).put('students', s)
}
export async function deleteStudent(id: string): Promise<void> {
  await (await db()).delete('students', id)
}

// === Sessions ===

export async function listSessions(): Promise<Session[]> {
  const all = await (await db()).getAllFromIndex('sessions', 'by-created')
  return all.reverse()
}
export async function getSession(id: string): Promise<Session | undefined> {
  return (await db()).get('sessions', id)
}
export async function putSession(s: Session): Promise<void> {
  await (await db()).put('sessions', s)
}
export async function deleteSession(id: string): Promise<void> {
  await (await db()).delete('sessions', id)
}
export async function listSessionsByStudent(studentId: string): Promise<Session[]> {
  const all = await listSessions()
  return all.filter((s) => s.studentIds.includes(studentId))
}

// === Paragraphs ===

const BUILTIN_PARAGRAPHS: Paragraph[] = paragraphPool.paragraphs.map((p) => ({
  id: `builtin-${p.id}`,
  title: p.title,
  text: p.text,
  grade: paragraphPool.grade,
  source: 'builtin',
  createdAt: '2026-05-06T00:00:00Z'
}))

export async function listParagraphs(): Promise<Paragraph[]> {
  const teacher = await (await db()).getAll('paragraphs')
  return [...BUILTIN_PARAGRAPHS, ...teacher.sort((a, b) => a.createdAt.localeCompare(b.createdAt))]
}

export async function getParagraph(id: string): Promise<Paragraph | undefined> {
  const builtin = BUILTIN_PARAGRAPHS.find((p) => p.id === id)
  if (builtin) return builtin
  return (await db()).get('paragraphs', id)
}

export async function putParagraph(p: Paragraph): Promise<void> {
  if (p.source === 'builtin') throw new Error('빌트인 단락은 수정할 수 없습니다')
  await (await db()).put('paragraphs', p)
}

export async function deleteParagraph(id: string): Promise<void> {
  if (id.startsWith('builtin-')) throw new Error('빌트인 단락은 삭제할 수 없습니다')
  await (await db()).delete('paragraphs', id)
}

export async function getParagraphOrFallback(id: string | null): Promise<Paragraph> {
  if (id) {
    const p = await getParagraph(id)
    if (p) return p
  }
  return BUILTIN_PARAGRAPHS[0]
}

// === Settings (localStorage) ===

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function putSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
  return next
}

// === Bulk export/import ===

export type Snapshot = {
  version: 2
  exportedAt: string
  students: Student[]
  sessions: Session[]
  paragraphs: Paragraph[]
  settings: Settings
}

export async function exportSnapshot(): Promise<Snapshot> {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    students: await listStudents(),
    sessions: await listSessions(),
    paragraphs: (await (await db()).getAll('paragraphs')),
    settings: getSettings()
  }
}

export async function importSnapshot(
  snap: Snapshot | (Omit<Snapshot, 'version' | 'paragraphs'> & { version: 1 }),
  mode: 'merge' | 'replace'
): Promise<void> {
  const d = await db()
  if (mode === 'replace') {
    const tx = d.transaction(['students', 'sessions', 'paragraphs'], 'readwrite')
    await tx.objectStore('students').clear()
    await tx.objectStore('sessions').clear()
    await tx.objectStore('paragraphs').clear()
    await tx.done
  }
  const tx = d.transaction(['students', 'sessions', 'paragraphs'], 'readwrite')
  for (const s of snap.students) await tx.objectStore('students').put(s)
  for (const s of snap.sessions) await tx.objectStore('sessions').put(s)
  if ('paragraphs' in snap && snap.paragraphs) {
    for (const p of snap.paragraphs) await tx.objectStore('paragraphs').put(p)
  }
  await tx.done
  putSettings(snap.settings)
}
