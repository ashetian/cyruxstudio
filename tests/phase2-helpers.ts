/**
 * cyrux studio — Phase 2 Opaque-Box Test Helpers
 *
 * Provides filesystem inspection, safe dynamic module loading (for progressive
 * testability during M7–M10), NextRequest builders, and Pure UI / Mobile UX audit helpers.
 * Strictly zero `any` types.
 */

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { NextRequest } from 'next/server';
import {
  createAdminSessionToken,
  SESSION_COOKIE_NAME,
} from '../src/lib/auth.ts';

export const ROOT_DIR = process.cwd();

export function rootPath(...segments: string[]): string {
  return path.resolve(ROOT_DIR, ...segments);
}

export function fileExists(relPath: string): boolean {
  return fs.existsSync(rootPath(relPath));
}

export function readFileText(relPath: string): string {
  const full = rootPath(relPath);
  if (!fs.existsSync(full)) {
    throw new Error(`Expected file does not exist: ${relPath}`);
  }
  return fs.readFileSync(full, 'utf8');
}

export function listFilesRecursive(
  relDir: string,
  extensions: string[] = ['.ts', '.tsx']
): string[] {
  const startDir = rootPath(relDir);
  if (!fs.existsSync(startDir)) return [];

  const results: string[] = [];
  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(path.relative(ROOT_DIR, full));
      }
    }
  };
  walk(startDir);
  return results.sort();
}

export async function dynamicImport<T extends Record<string, unknown>>(
  relPath: string
): Promise<T> {
  const full = rootPath(relPath);
  if (!fs.existsSync(full)) {
    throw new Error(`Required module not yet implemented: ${relPath}`);
  }
  const fileUrl = pathToFileURL(full).href;
  const loaded = (await import(fileUrl)) as T;
  return loaded;
}

export async function getTestAdminToken(): Promise<string> {
  return await createAdminSessionToken({
    email: process.env.ADMIN_EMAIL || 'admin@cyrux.studio',
    sub: 'admin',
    role: 'admin',
  });
}

export interface RequestBuildOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
}

export async function buildNextRequest(
  urlPath: string,
  options: RequestBuildOptions = {}
): Promise<NextRequest> {
  const url = urlPath.startsWith('http')
    ? urlPath
    : `http://localhost:3000${urlPath}`;
  const method = options.method ?? 'GET';
  const headers = new Headers(options.headers ?? {});

  if (options.authenticated) {
    const token = await getTestAdminToken();
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('Cookie', `${SESSION_COOKIE_NAME}=${token}`);
  }

  let bodyInit: string | undefined;
  if (options.body !== undefined && method !== 'GET' && method !== 'HEAD') {
    headers.set('Content-Type', 'application/json');
    bodyInit =
      typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
  }

  return new NextRequest(url, {
    method,
    headers,
    body: bodyInit,
  });
}

export type RouteHandlerFn = (
  req: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<Response>;

export async function invokeRouteHandler(
  handler: RouteHandlerFn,
  urlPath: string,
  options: RequestBuildOptions & { params?: Record<string, string> } = {}
): Promise<{ status: number; json: Record<string, unknown>; rawText: string }> {
  const req = await buildNextRequest(urlPath, options);
  const res = await handler(req, {
    params: Promise.resolve(options.params ?? {}),
  });
  const rawText = await res.text();
  let json: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      json = parsed as Record<string, unknown>;
    }
  } catch {
    json = {};
  }
  return { status: res.status, json, rawText };
}

// ============================================================================
// Pure UI, White Atelier Theme & Mobile Ergonomics Audit Helpers
// ============================================================================

/**
 * Finds double-slash UI strings like `"// ARCHIVE"`, `{"// 404 ERROR //"}`, `> // 2026 <`,
 * while ignoring URLs (`http://`, `https://`), JS/TS line comments, and regex literals.
 */
export function findDoubleSlashUiStrings(content: string): string[] {
  const findings: string[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }
    // Check string literals & JSX text that contain // not preceded by : (http://, https://)
    const stringMatches = line.match(/(["'`>])\s*\/\/(?!\s*\*)[^"'`<]*/g);
    if (stringMatches) {
      for (const m of stringMatches) {
        if (!m.includes('http://') && !m.includes('https://')) {
          findings.push(`L${i + 1}: ${m.trim()}`);
        }
      }
    }
    // Also detect inline JSX text like `// CHAPTER` or `// ERROR`
    if (/(?<!:)\/\/\s+[A-Z0-9]{2,}/.test(line) && !trimmed.startsWith('//')) {
      // Ensure it is inside quotes or JSX, not a trailing TS comment
      const codeBeforeComment = line.split(/["'`>]/);
      if (codeBeforeComment.length > 1 && /["'`>][^"'`]*\/\/\s*[A-Z0-9]/.test(line)) {
        findings.push(`L${i + 1}: ${trimmed}`);
      }
    }
  }
  return Array.from(new Set(findings));
}

export const FORBIDDEN_HUD_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'TELEMETRY', pattern: /\bTELEMETRY\b/i },
  { label: 'SPEC_OPS', pattern: /\bSPEC_OPS\b/i },
  { label: 'SYSTEM_ACTIVE', pattern: /\bSYSTEM_ACTIVE\b/i },
  { label: 'LAT_LONG', pattern: /\bLAT_LONG\b/i },
  { label: 'GRID_REF', pattern: /\bGRID_REF\b/i },
  { label: 'RESTRICTED TERMINAL', pattern: /RESTRICTED TERMINAL/i },
  { label: 'SESSION GUARD', pattern: /SESSION GUARD/i },
  { label: '35.1856° N', pattern: /35\.1856/ },
  { label: 'FORGE', pattern: /\bFORGE\b/ },
  { label: 'MATRIX', pattern: /\bMATRIX\b/ },
  { label: 'CORNER_TICKS', pattern: /[⌜⌝⌞⌟]/ },
];

export const FORBIDDEN_STOREFRONT_JARGON: Array<{ label: string; pattern: RegExp }> = [
  ...FORBIDDEN_HUD_PATTERNS,
  { label: 'cyberpunk', pattern: /\bcyberpunk\b/i },
  { label: 'SPECIMEN', pattern: /\bSPECIMEN\b/ },
  { label: '02 • HARDWARE', pattern: /02\s*•\s*HARDWARE|HARDWARE/ },
];

export function findForbiddenJargon(
  content: string,
  patterns: Array<{ label: string; pattern: RegExp }> = FORBIDDEN_HUD_PATTERNS
): string[] {
  const hits: string[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    for (const { label, pattern } of patterns) {
      if (pattern.test(line)) {
        hits.push(`L${i + 1} [${label}]: ${trimmed.slice(0, 90)}`);
      }
    }
  }
  return hits;
}

const EMOJI_REGEX =
  /[\u{1F300}-\u{1FAFF}\u{26A1}\u{2728}\u{2764}\u{2705}\u{274C}]/u;

export function findEmojiInUiCopy(content: string): string[] {
  const hits: string[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (EMOJI_REGEX.test(line)) {
      hits.push(`L${i + 1}: ${trimmed.slice(0, 80)}`);
    }
  }
  return hits;
}

export function findPulsingDotOrGlowRemnants(content: string): string[] {
  const hits: string[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Flag decorative pulsing dots, pulsing badges, or pulsing icons/glows
    if (
      line.includes('animate-pulse') &&
      (line.includes('rounded-full') ||
        line.includes('emerald') ||
        line.includes('red-500') ||
        line.includes('amber-400') ||
        line.includes('Heart') ||
        line.includes('shadow-['))
    ) {
      hits.push(`L${i + 1}: ${line.trim().slice(0, 90)}`);
    }
    if (/shadow-\[0_0_\d+px/.test(line)) {
      hits.push(`L${i + 1} [neon-glow]: ${line.trim().slice(0, 90)}`);
    }
  }
  return hits;
}

export function findAdminDarkThemeRemnants(content: string): string[] {
  const darkSurfaceTokens = [
    'bg-[#121212]',
    'bg-[#0E0E0E]',
    'bg-[#0C0C0D]',
    'bg-[#141414]',
    'bg-[#181818]',
    'bg-[#1A1A1A]',
    'bg-[#111111]',
    'bg-neutral-900',
    'bg-neutral-950',
    'bg-zinc-900',
    'bg-zinc-950',
    'text-[#FAF8F3] font-mono',
  ];
  const hits: string[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const token of darkSurfaceTokens) {
      if (line.includes(token)) {
        hits.push(`L${i + 1} [${token}]: ${line.trim().slice(0, 80)}`);
      }
    }
    // Also detect dark page/header/card root containers using bg-[#0A0A0A] with light text
    if (
      line.includes('bg-[#0A0A0A]') &&
      (line.includes('min-h-screen') ||
        line.includes('<header') ||
        line.includes('<main') ||
        line.includes('text-[#FAF8F3]')) &&
      !line.includes('<button')
    ) {
      hits.push(`L${i + 1} [dark-container bg-[#0A0A0A]]: ${line.trim().slice(0, 80)}`);
    }
  }
  return hits;
}

export function hasWhiteAtelierTokens(content: string): boolean {
  const hasLightBg =
    content.includes('#FFFFFF') ||
    content.includes('#FAF8F3') ||
    content.includes('bg-white') ||
    content.includes('bg-[#FAF8F3]') ||
    content.includes('bg-[#FFFFFF]');
  const hasInk =
    content.includes('#0A0A0A') ||
    content.includes('text-black') ||
    content.includes('text-[#0A0A0A]');
  return hasLightBg && hasInk;
}

export function hasAccessibleTouchTargets(content: string): boolean {
  return (
    content.includes('min-h-[44px]') ||
    content.includes('min-h-11') ||
    content.includes('h-11') ||
    content.includes('h-12') ||
    content.includes('min-h-[48px]') ||
    content.includes('py-3') ||
    content.includes('py-3.5')
  );
}

export function findExplicitAnyTypes(content: string): string[] {
  const hits: string[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    if (/:\s*any\b|\bas\s+any\b|<any>/.test(line)) {
      hits.push(`L${i + 1}: ${trimmed.slice(0, 90)}`);
    }
  }
  return hits;
}
