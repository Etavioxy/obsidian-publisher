import { parseWikiLink } from '../utils/parseWikiLink';
import { resolveLinkPath } from '../utils/linkResolver';

export interface PreprocessorOptions {
  linkmap?: Record<string, string | string[]>;
  basePath?: string; // e.g. '/attachments'
  currentFilePath?: string; // for context-aware resolution
}

function normalizeBase(basePath?: string) {
  const base = basePath || '/attachments';
  if (base.endsWith('/')) return base.slice(0, -1);
  return base;
}

function encodePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function resolvePath(path: string, opts: PreprocessorOptions): string {
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

  // 对内部路径进行 encodeURIComponent
  const [prefix, ...rest] = finalPath.split('://');
  if (rest.length > 0) {
    // 已有协议
    return `${prefix}://${encodePath(rest.join('://'))}`;
  }
  return encodePath(finalPath.startsWith('/') ? finalPath.slice(1) : finalPath);
}

function normalizeSize(size?: string): string {
  if (!size) return '';
  const match = size.match(/^(\d+)(x(\d+))?$/);
  if (!match) return '';
  const width = match[1];
  const height = match[3];
  return height ? `${width}x${height}` : `${width}x0`;
}

function isImagePath(path: string): boolean {
  return /\.(png|jpe?g|gif|svg|webp|bmp|avif)$/i.test(path);
}

// Preprocessor: Obsidian SSG Markdown preprocessor (single pass)
export function obsidianPreprocessor(text: string, options: PreprocessorOptions = {}): string {
  let i = 0;
  const len = text.length;
  let result = '';

  while (i < len) {
    const ch = text[i];
    const nextTwo = text.slice(i, i + 2);
    const nextThree = text.slice(i, i + 3);

    // 图片/文件 embed: ![[...]]
    if (nextThree === '![[') {
      const end = text.indexOf(']]', i + 3);
      if (end === -1) {
        result += ch;
        i += 1;
        continue;
      }

      const rawContent = text.slice(i + 3, end);
      const info = parseWikiLink(rawContent);
      const resolved = resolvePath(info.path, options);
      const size = normalizeSize(info.size);
      const encodedHref = resolved.startsWith('http') ? resolved : `/${resolved}`;

      if (isImagePath(info.path)) {
        const alt = size ? `${info.display}|${size}` : info.display;
        result += `![${alt}](${encodedHref}){.obsidian-embed}`;
      } else {
        const textLabel = info.display || info.path;
        result += `[${textLabel}](${encodedHref}){.obsidian-embed-file}`;
      }

      i = end + 2;
      continue;
    }

    // 普通 wikilink: 保持原样，由插件处理
    if (nextTwo === '[[') {
      const end = text.indexOf(']]', i + 2);
      if (end === -1) {
        result += ch;
        i += 1;
        continue;
      }
      result += text.slice(i, end + 2);
      i = end + 2;
      continue;
    }

    result += ch;
    i += 1;
  }

  // 标准 Markdown 图片宽度补全：![alt|600](url) -> ![alt|600x0](url)
  result = result.replace(/!\[([^\]]*?)\|(\d+)\]\(([^)]+)\)/g, (_m, alt, width, url) => {
    return `![${alt}|${width}x0](${url})`;
  });

  return result;
}

// markdown-it 插件包装：在 normalize 前修改源文本
export function usePreprocessor(md: any, options: PreprocessorOptions = {}) {
  md.core.ruler.before('normalize', 'obsidian_preprocessor', (state: any) => {
    state.src = obsidianPreprocessor(state.src, options);
  });
}
