import { openDB, type IDBPDatabase, type DBSchema } from 'idb'
import type { Session, Settings, Student } from './types'
import { DEFAULT_SETTINGS } from './types'

const DB_NAME = 'saccade-trainer'
const DB_VERSION = 1
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
}

let dbPromise: Promise<IDBPDatabase<SaccadeDB>> | null = null

function db(): Promise<IDBPDatabase<SaccadeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<SaccadeDB>(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains('students')) {
          const s = d.createObjectStore('students', { keyPath: 'id' })
          s.createIndex('by-registered', 'registeredAt')
        }
        if (!d.objectStoreNames.contains('sessions')) {
          const s = d.createObjectStore('sessions', { keyPath: 'id' })
          s.createIndex('by-date', 'date')
          s.createIndex('by-created', 'createdAt')
        }
      }
    })
  }
  return dbPromise
}

// === Students ===

export async function listStudents(): Promise<Student[]> {
  const all = await (await db()).getAllFromIndex('students', 'by-registered')
  return all
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
  return all.reverse() // 최신부터
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
  version: 1
  exportedAt: string
  students: Student[]
  sessions: Session[]
  settings: Settings
}

export async function exportSnapshot(): Promise<Snapshot> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    students: await listStudents(),
    sessions: await listSessions(),
    settings: getSettings()
  }
}

export async function importSnapshot(snap: Snapshot, mode: 'merge' | 'replace'): Promise<void> {
  const d = await db()
  if (mode === 'replace') {
    const tx = d.transaction(['students', 'sessions'], 'readwrite')
    await tx.objectStore('students').clear()
    await tx.objectStore('sessions').clear()
    await tx.done
  }
  const tx = d.transaction(['students', 'sessions'], 'readwrite')
  for (const s of snap.students) await tx.objectStore('students').put(s)
  for (const s of snap.sessions) await tx.objectStore('sessions').put(s)
  await tx.done
  putSettings(snap.settings)
}
