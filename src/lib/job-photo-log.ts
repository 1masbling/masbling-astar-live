export interface JobPhotoLogEntry {
  id: string;
  localUrl: string;
  photo_url: string | null;
  caption: string;
  phase: 'before' | 'after' | null;
  created_at: string;
}

const STORAGE_KEY = 'job_photo_log';

let entries: JobPhotoLogEntry[] = load();
const listeners = new Set<() => void>();

function load(): JobPhotoLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JobPhotoLogEntry[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full or unavailable — in-memory list still works for this session.
  }
  listeners.forEach(l => l());
}

export function getJobPhotoLog(): JobPhotoLogEntry[] {
  return entries;
}

export function subscribeToJobPhotoLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addJobPhotoLogEntry(entry: JobPhotoLogEntry) {
  entries = [entry, ...entries];
  persist();
}

export function removeJobPhotoLogEntry(id: string) {
  entries = entries.filter(e => e.id !== id);
  persist();
}

export function updateJobPhotoLogEntry(id: string, updates: Partial<Omit<JobPhotoLogEntry, 'id'>>) {
  entries = entries.map(e => (e.id === id ? { ...e, ...updates } : e));
  persist();
}
