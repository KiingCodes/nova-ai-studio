import { toast } from 'sonner';
import { exportProjectZip } from './exportZip';
import type { ProjectRecord, ProjectVersion } from './projectStore';

/**
 * Download the project as a ZIP and attempt to launch VS Code via its
 * custom protocol handler. Browsers cannot open a local folder directly,
 * so we ship the ZIP, try `vscode://` to focus VS Code, and instruct the
 * user to extract & open the folder.
 */
export async function openInVSCode(project: ProjectRecord, version: ProjectVersion) {
  try {
    await exportProjectZip(project, version);
  } catch (e: any) {
    toast.error(e?.message || 'Could not prepare ZIP');
    return;
  }
  toast.success('ZIP downloaded — extract & open in VS Code', {
    description: 'Launching VS Code… run "code <folder>" if it doesn\'t open.',
    duration: 6000,
  });
  // Best-effort protocol launch (no-op if VS Code isn't installed).
  try {
    const a = document.createElement('a');
    a.href = 'vscode://';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  } catch { /* ignore */ }
}
