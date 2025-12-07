/**
 * 链接解析与路径匹配逻辑
 * 支持：
 * - 精确路径匹配
 * - 同名文件歧义处理（与 Obsidian 一致）
 * - 相对/绝对路径
 */

export interface LinkResolverOptions {
  linkmap: Record<string, string | string[]>;
  currentFilePath?: string; // 当前文件路径（用于相对查询，可选）
}

export interface LinkResolution {
  resolved: string;        // 最终解析的路径
  candidates: string[];    // 所有候选（仅当有歧义时）
  isAmbiguous: boolean;    // 是否存在歧义（多个同名）
}

/**
 * 从 linkmap 解析路径，支持同名处理
 * 规则（按优先级）：
 * 1. 精确路径匹配（e.g., "Notes/开发" 匹配 linkmap["Notes/开发"]）
 * 2. 文件名匹配（e.g., "开发" 匹配 linkmap["开发"] 或通过扫描）
 * 3. 若多个同名，返回第一个（Obsidian 会根据上下文选择）
 */
export function resolveLinkPath(
  path: string,
  options: LinkResolverOptions
): LinkResolution {
  const { linkmap } = options;

  // 1. 精确匹配
  const exact = linkmap[path];
  if (exact) {
    const resolved = Array.isArray(exact) ? exact[0] : exact;
    const candidates = Array.isArray(exact) ? exact : [exact];
    return {
      resolved,
      candidates,
      isAmbiguous: Array.isArray(exact) && exact.length > 1,
    };
  }

  // 2. 文件名匹配（用于处理 "开发" → ["/Notes/开发.md", "/Notes/path2/开发.md"]）
  // 提取最后一段作为文件名
  const lastSegment = path.split('/').pop() || path;
  const byName = linkmap[lastSegment];
  
  if (byName) {
    const candidates = Array.isArray(byName) ? byName : [byName];
    
    // 如果有多个候选，尝试找到匹配路径前缀的候选
    if (candidates.length > 1) {
      // 例如 path="test/a"，candidates=["/a", "/test/a"]
      // 应该匹配 "/test/a"
      const normalized = path.startsWith('/') ? path : `/${path}`;
      for (const candidate of candidates) {
        if (candidate.endsWith(normalized) || candidate.endsWith(normalized.replace(/^\//, ''))) {
          return {
            resolved: candidate,
            candidates,
            isAmbiguous: true,
          };
        }
      }
      // 如果路径前缀都不匹配，返回第一个
      const resolved = candidates[0];
      return {
        resolved,
        candidates,
        isAmbiguous: true,
      };
    }
    
    const resolved = candidates[0];
    return {
      resolved,
      candidates,
      isAmbiguous: false,
    };
  }

  // 3. 无法解析，返回原始路径 + 警告
  return {
    resolved: path,
    candidates: [],
    isAmbiguous: false,
  };
}

/**
 * 在 linkmap 中查找所有包含某个文件名的候选
 */
export function findSimilarInLinkmap(
  query: string,
  linkmap: Record<string, string | string[]>
): string[] {
  const results: string[] = [];
  const normalized = query.toLowerCase();

  for (const [key, val] of Object.entries(linkmap)) {
    const candidates = Array.isArray(val) ? val : [val];
    
    for (const candidate of candidates) {
      // 匹配文件名部分（可能有或没有扩展名）
      const baseName = candidate.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase();
      if (baseName === normalized) {
        results.push(candidate);
      }
    }
  }

  return [...new Set(results)]; // 去重
}
