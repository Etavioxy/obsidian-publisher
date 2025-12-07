import type MarkdownIt from 'markdown-it';

// Embed 插件：当前预处理阶段已将图片 embed 转为标准 markdown 图片，
// 这里只对带有 .obsidian-embed-file 类的链接做轻量增强（添加包装类）。
export function obsidianEmbed(md: MarkdownIt) {
  const defaultRender = md.renderer.rules.link_open || function (tokens, idx, opts, env, self) {
    return self.renderToken(tokens, idx, opts);
  };

  md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
    const token = tokens[idx];
    const clsIndex = token.attrIndex('class');
    if (clsIndex !== -1) {
      const current = token.attrs?.[clsIndex][1] || '';
      if (current.includes('obsidian-embed-file')) {
        token.attrs![clsIndex][1] = `${current} obsidian-embed-file`;
      }
    }
    return defaultRender(tokens, idx, options, env, self);
  };
}
