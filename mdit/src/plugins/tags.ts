import type MarkdownIt from 'markdown-it';

// 标签支持：#tag、#中文tag、#tag/path、#my-tag、#my_tag 等
// 前面必须是空白或行首
// 后续是合法标签字符（字母、数字、下划线、连字符、斜杠、中文、emoji）
const TAG_PATTERN = /(^|[\s])#([\p{L}\p{N}_\-/\p{Emoji_Presentation}\p{Emoji}\p{Extended_Pictographic}]+)/gu;

export function obsidianTags(md: MarkdownIt) {
  md.core.ruler.after('inline', 'obsidian_tags', (state) => {
    state.tokens.forEach((blockToken) => {
      if (blockToken.type !== 'inline' || !blockToken.children) return;

      const newChildren: any[] = [];

      blockToken.children.forEach((child) => {
        if (child.type !== 'text') {
          newChildren.push(child);
          return;
        }

        let text = child.content;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        let hasMatch = false;

        // 使用全局正则逐个匹配标签
        while ((match = TAG_PATTERN.exec(text)) !== null) {
          hasMatch = true;
          const [full, prefix, tagName] = match;
          const startIndex = match.index;
          const endIndex = startIndex + full.length;

          // 添加前面的文本和空白
          if (startIndex > lastIndex) {
            const t = new state.Token('text', '', 0);
            t.content = text.slice(lastIndex, startIndex + prefix.length);
            newChildren.push(t);
          } else if (prefix) {
            // 如果有前缀空白，先添加空白
            const t = new state.Token('text', '', 0);
            t.content = prefix;
            newChildren.push(t);
          }

          // 创建 span token 包装标签
          const open = new state.Token('span_open', 'span', 1);
          open.attrs = [
            ['class', 'obsidian-tag'],
            ['data-tag', tagName],
          ];

          const tText = new state.Token('text', '', 0);
          tText.content = `#${tagName}`;

          const close = new state.Token('span_close', 'span', -1);

          newChildren.push(open, tText, close);
          lastIndex = endIndex;
        }

        // 只有找到标签时，才处理剩余文本并替换 children
        if (hasMatch) {
          // 添加剩余文本
          if (lastIndex < text.length) {
            const t = new state.Token('text', '', 0);
            t.content = text.slice(lastIndex);
            newChildren.push(t);
          }
        } else {
          // 没有匹配任何标签，保持原样
          newChildren.push(child);
        }
      });

      // 只有当 newChildren 包含了替换时才更新
      if (newChildren.some(t => t.type === 'span_open')) {
        blockToken.children = newChildren;
      }
    });
  });
}

