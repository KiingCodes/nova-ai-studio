// Project + version store backed by localStorage.
import { type HtmlValidationResult } from './htmlValidator';

export interface ProjectVersion {
  id: string;
  label: string;        // e.g. "v1", "v2 — added pricing"
  prompt: string;       // user prompt or chat command for this version
  html: string;
  createdAt: number;
  validation?: HtmlValidationResult;
}

export interface ProjectRecord {
  id: string;
  name: string;
  initialPrompt: string;
  versions: ProjectVersion[];
  activeVersionId: string;
  createdAt: number;
  updatedAt: number;
}

const KEY = 'kinging.projects.v1';
const ACTIVE_KEY = 'kinging.activeProjectId.v1';

function read(): Record<string, ProjectRecord> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function write(map: Record<string, ProjectRecord>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export const projectStore = {
  list(): ProjectRecord[] {
    return Object.values(read()).sort((a, b) => b.updatedAt - a.updatedAt);
  },
  get(id: string): ProjectRecord | null {
    return read()[id] ?? null;
  },
  getActiveId(): string | null {
    return localStorage.getItem(ACTIVE_KEY);
  },
  setActiveId(id: string | null) {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  },
  create(opts: { name: string; prompt: string; html: string; validation?: HtmlValidationResult }): ProjectRecord {
    const map = read();
    const id = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = Date.now();
    const record: ProjectRecord = {
      id,
      name: opts.name,
      initialPrompt: opts.prompt,
      versions: [{
        id: versionId,
        label: 'v1',
        prompt: opts.prompt,
        html: opts.html,
        createdAt: now,
        validation: opts.validation,
      }],
      activeVersionId: versionId,
      createdAt: now,
      updatedAt: now,
    };
    map[id] = record;
    write(map);
    localStorage.setItem(ACTIVE_KEY, id);
    return record;
  },
  addVersion(projectId: string, opts: { prompt: string; html: string; validation?: HtmlValidationResult }): ProjectRecord | null {
    const map = read();
    const rec = map[projectId];
    if (!rec) return null;
    const versionId = crypto.randomUUID();
    const now = Date.now();
    const summary = opts.prompt.length > 32 ? opts.prompt.slice(0, 32) + '…' : opts.prompt;
    rec.versions.push({
      id: versionId,
      label: `v${rec.versions.length + 1} — ${summary}`,
      prompt: opts.prompt,
      html: opts.html,
      createdAt: now,
      validation: opts.validation,
    });
    rec.activeVersionId = versionId;
    rec.updatedAt = now;
    map[projectId] = rec;
    write(map);
    return rec;
  },
  setActiveVersion(projectId: string, versionId: string): ProjectRecord | null {
    const map = read();
    const rec = map[projectId];
    if (!rec) return null;
    if (!rec.versions.find(v => v.id === versionId)) return null;
    rec.activeVersionId = versionId;
    rec.updatedAt = Date.now();
    map[projectId] = rec;
    write(map);
    return rec;
  },
  remove(projectId: string) {
    const map = read();
    delete map[projectId];
    write(map);
    if (localStorage.getItem(ACTIVE_KEY) === projectId) localStorage.removeItem(ACTIVE_KEY);
  },
};

export function getActiveVersion(rec: ProjectRecord): ProjectVersion | null {
  return rec.versions.find(v => v.id === rec.activeVersionId) ?? rec.versions[rec.versions.length - 1] ?? null;
}
