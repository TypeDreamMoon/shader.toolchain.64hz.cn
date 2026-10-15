import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The versions the homepage shows, read at build time from the release notes, so the
 * hero never lags a release: the plugin's page is generated from the plugin's own
 * `Docs/changelog/dreamshader.md`, and the extension's is the newest entry of
 * `changelog/vscode-extension`. A page that no longer says either fails the build
 * rather than showing a stale number.
 */
function changelog(name: string): string {
  return readFileSync(join(process.cwd(), 'content/docs/changelog', name), 'utf8');
}

export function pluginVersion(): string {
  const match = /^\|\s*Current release\s*\|\s*\*\*([0-9][^*]*)\*\*/m.exec(changelog('dreamshader.en.md'));
  if (!match) throw new Error('content/docs/changelog/dreamshader.en.md has no "Current release" row');
  return match[1].trim();
}

export function extensionVersion(): string {
  const match = /^## ([0-9]+\.[0-9]+\.[0-9]+)\b/m.exec(changelog('vscode-extension.en.mdx'));
  if (!match) throw new Error('content/docs/changelog/vscode-extension.en.mdx has no release heading');
  return match[1];
}
