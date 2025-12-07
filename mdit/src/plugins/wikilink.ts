import type MarkdownIt from 'markdown-it';
import { parseWikiLink } from '../utils/parseWikiLink';
import { resolveLinkPath } from '../utils/linkResolver';

interface WikiLinkOptions {
  linkmap?: Record<string, string | string[]>;
  basePath?: string;
  currentFilePath?: string; // for context-aware same-name resolution
}

function normalizeBase(basePath?: string) {
  const base = basePath || '/attachments';
  return base.endsWith('/') ? base.slice(0, -1) : base;
}

function encodePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function resolvePath(path: string, opts: WikiLinkOptions): string {
  const { linkmap } = opts;
  const base = normalizeBase(opts.basePath);

  let target: string | undefined;
  
  if (linkmap) {
    const resolution = resolveLinkPath(path, { linkmap, currentFilePath: opts.currentFilePath });
    if (resolution.candidates.length > 0) {
      target = resolution.resolved;
    }
  }

  const finalPath = target || `${base}/${path}`;
  if (/^https?:\/\//i.test(finalPath)) return finalPath;
  return `/${encodePath(finalPath.startsWith('/') ? finalPath.slice(1) : finalPath)}`;
}

export function obsidianWikiLink(md: MarkdownIt, options: WikiLinkOptions = {}) {
  const rule = (state: any, silent: boolean) => {
    const start = state.pos;
    const max = state.posMax;

    if (start + 2 >= max) return false;
    if (state.src.slice(start, start + 2) !== '[[') return false;

    const end = state.src.indexOf(']]', start + 2);
    if (end === -1) return false;

    if (silent) return false;

    const rawContent = state.src.slice(start + 2, end);
    const info = parseWikiLink(rawContent);
    const href = resolvePath(info.path, options);
    const finalHref = info.anchor ? `${href}#${encodeURIComponent(info.anchor)}` : href;
    const text = info.display || info.path;

    const tokenOpen = state.push('link_open', 'a', 1);
    tokenOpen.attrs = [['href', finalHref]];
    const tokenText = state.push('text', '', 0);
    tokenText.content = text;
    state.push('link_close', 'a', -1);

    state.pos = end + 2;
    return true;
  };

  md.inline.ruler.before('link', 'obsidian_wikilink', rule);
}
