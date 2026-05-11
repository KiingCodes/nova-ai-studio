// Generates a downloadable validation report (Markdown) from a project version.
import type { ProjectRecord, ProjectVersion } from './projectStore';

export function buildValidationReport(project: ProjectRecord, version: ProjectVersion): string {
  const v = version.validation;
  const lines: string[] = [];
  lines.push(`# Validation Report`);
  lines.push('');
  lines.push(`**Project:** ${project.name}`);
  lines.push(`**Version:** ${version.label}`);
  lines.push(`**Generated:** ${new Date(version.createdAt).toLocaleString()}`);
  lines.push(`**Prompt:** ${version.prompt}`);
  lines.push('');
  if (!v) { lines.push('_No validation data._'); return lines.join('\n'); }

  lines.push(`## Score: ${v.score}/100  ${v.ok ? '✅' : '⚠️'}`);
  lines.push('');
  lines.push(`### Stats`);
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  for (const [k, val] of Object.entries(v.stats)) lines.push(`| ${k} | ${val} |`);
  lines.push('');

  if (v.errors.length) {
    lines.push(`### Errors (${v.errors.length})`);
    v.errors.forEach(e => lines.push(`- ❌ ${e}`));
    lines.push('');
  }
  if (v.warnings.length) {
    lines.push(`### Warnings (${v.warnings.length})`);
    v.warnings.forEach(w => lines.push(`- ⚠️ ${w}`));
    lines.push('');
  }
  if (!v.errors.length && !v.warnings.length) {
    lines.push('No issues detected. ✨');
  }
  return lines.join('\n');
}

export function downloadReport(project: ProjectRecord, version: ProjectVersion) {
  const md = buildValidationReport(project, version);
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.toLowerCase()}-${version.label.replace(/\s.*/, '')}-report.md`;
  a.click();
  URL.revokeObjectURL(url);
}
