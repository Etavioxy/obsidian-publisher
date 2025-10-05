import type { Plugin } from 'vitepress';
import MarkdownIt from 'markdown-it';

// 双链插件
function obsidianWikiLinks(md: MarkdownIt) {
  md.inline.ruler.before('link', 'obsidian_wikilink', (state, silent) => {
    const start = state.pos;
    const marker = '[[';
    const markerEnd = ']]';
    
    // 检查是否以 [[ 开始
    if (start + marker.length >= state.posMax) return false;
    if (state.src.slice(start, start + marker.length) !== marker) return false;
    
    // 查找结束标记
    const end = state.src.indexOf(markerEnd, start + marker.length);
    if (end === -1) return false;
    
    if (!silent) {
      const content = state.src.slice(start + marker.length, end);
      const [link, display] = content.split('|').map(s => s.trim());
      const displayText = display || link;
      
      // 创建链接 token
      const token = state.push('link_open', 'a', 1);
      token.attrSet('href', `${slugify(link)}.html`);
      
      const textToken = state.push('text', '', 0);
      textToken.content = displayText;
      
      state.push('link_close', 'a', -1);
    }
    
    state.pos = end + markerEnd.length;
    return true;
  });
}

// 标签插件
function obsidianTags(md: MarkdownIt) {
  md.inline.ruler.push('obsidian_tag', (state, silent) => {
    const start = state.pos;
    const marker = '#';
    
    if (state.src.charCodeAt(start) !== 0x23) return false; // #
    if (start > 0 && /\S/.test(state.src[start - 1])) return false; // 前面不能是非空白字符
    
    let pos = start + 1;
    let tagEnd = pos;
    
    // 匹配标签字符
    while (tagEnd < state.posMax) {
      const char = state.src[tagEnd];
      if (/[a-zA-Z0-9_\-/]/.test(char)) {
        tagEnd++;
      } else {
        break;
      }
    }
    
    if (tagEnd === pos) return false; // 没有找到有效标签
    
    if (!silent) {
      const tagContent = state.src.slice(pos, tagEnd);
      
      const token = state.push('html_inline', '', 0);
      token.content = `<span class="tag" data-tag="${tagContent}">#${tagContent}</span>`;
    }
    
    state.pos = tagEnd;
    return true;
  });
}

// 嵌入文件插件
function obsidianEmbeds(md: MarkdownIt) {
  md.block.ruler.before('paragraph', 'obsidian_embed', (state, start, end, silent) => {
    const pos = state.bMarks[start] + state.tShift[start];
    const max = state.eMarks[start];
    
    if (pos + 4 > max) return false;
    if (state.src.slice(pos, pos + 3) !== '![[') return false;
    
    const lineText = state.src.slice(pos, max);
    const match = lineText.match(/^!\[\[([^\]]+)\]\]/);
    
    if (!match) return false;
    
    if (!silent) {
      const [, embedPath] = match;
      const isImage = /\.(png|jpe?g|gif|svg|webp)$/i.test(embedPath);
      
      let token;
      if (isImage) {
        token = state.push('image', 'img', 0);
        token.attrSet('src', embedPath);
        token.attrSet('alt', '');
      } else {
        // 处理其他文件类型的嵌入
        token = state.push('html_block', '', 0);
        token.content = `<div class="embed-file" data-src="${embedPath}">
          <a href="${embedPath}" target="_blank">${embedPath}</a>
        </div>`;
      }
    }
    
    state.line = start + 1;
    return true;
  });
}

// 辅助函数
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export function obsidianPlugin(): Plugin {
  return {
    name: 'obsidian-syntax',
    configureServer(server) {
      // 开发服务器配置
    },
    config(config) {
      // 添加 markdown 插件配置
      if (!config.markdown) {
        config.markdown = {};
      }
      
      const originalConfig = config.markdown.config;
      config.markdown.config = (md) => {
        // 应用原有配置
        if (originalConfig) {
          originalConfig(md);
        }
        
        // 应用 Obsidian 插件
        md.use(obsidianWikiLinks);
        md.use(obsidianTags);
        md.use(obsidianEmbeds);
      };
    }
  };
}
