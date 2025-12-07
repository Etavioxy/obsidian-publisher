// 统一 WikiLink 解析器
// 支持中文、emoji、空格、C#、符号等任意字符。
// 规则：
// - 使用最后一个 '|' 作为显示文本分割符
// - 使用第一个 '#' 作为锚点分割符
// - 去掉 .md/.MD 后缀
// - 若显示段匹配尺寸（数字或 数字x数字），记录 size

export interface WikiLinkInfo {
  path: string;      // 不含显示名与锚点，不含 .md 后缀
  display: string;   // 显示文本（无则回退 path）
  anchor?: string;   // 片段锚点
  size?: string;     // 可选尺寸（"600" | "600x400"）
}

const sizePattern = /^\s*(\d+)(x(\d+))?\s*$/;

function stripMdExtension(path: string): string {
  return path.replace(/\.md$/i, '');
}

export function parseWikiLink(raw: string): WikiLinkInfo {
  const inner = raw.trim();

  // 拆分显示文本（使用最后一个 |）
  const pipeIndex = inner.lastIndexOf('|');
  const pathPart = pipeIndex === -1 ? inner : inner.slice(0, pipeIndex);
  const displayPart = pipeIndex === -1 ? '' : inner.slice(pipeIndex + 1).trim();

  // 拆分锚点（第一个 #）
  const hashIndex = pathPart.indexOf('#');
  const pathWithoutAnchor = hashIndex === -1 ? pathPart : pathPart.slice(0, hashIndex);
  const anchor = hashIndex === -1 ? undefined : pathPart.slice(hashIndex + 1);

  const normalizedPath = stripMdExtension(pathWithoutAnchor.trim());

  // 检查 displayPart 是否为尺寸格式
  let display = displayPart || normalizedPath;
  let size: string | undefined;

  const sizeMatch = displayPart.match(sizePattern);
  if (sizeMatch && displayPart === sizeMatch[0]) {
    // displayPart 完全匹配尺寸格式，则作为 size，display 回退到 path
    const width = sizeMatch[1];
    const height = sizeMatch[3];
    size = height ? `${width}x${height}` : `${width}`;
    display = normalizedPath;
  }

  return {
    path: normalizedPath,
    display,
    anchor: anchor && anchor.trim() ? anchor.trim() : undefined,
    size,
  };
}
