// 双链插件
// 属于 inline ruler linkify 规则
// see https://github.com/binyamin/markdown-it-wikilinks/blob/main/index.js 
export function obsidianWikiLinks(md, opts = {}) {
  // 设置默认 base 路径
  let base = opts.base || '/';
  let linkmap = opts.linkmap || {};

  // 添加 Wiki 链接解析规则
  md.linkify.add("[[", {
    // 增强版正则，支持中文字符、表情符号和复杂路径
    validate: /^([\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F\w\s\/\-#:.,()\u4e00-\u9fff]+)(\.(md|markdown))?\s*(\|([^\]]+))?\]\]/u,
    
    // 链接标准化处理
    normalize: (match) => {
      const raw = match.raw.slice(2, -2);
      // [page#section|display] or [page|display] or [page]
      let [target, display] = raw.split('|').map(s => s.trim());
      let [pathPart, anchorPart] = target.split('#');
      pathPart = pathPart.replace(/\.(md|markdown)$/i, '');
      
      if (!pathPart || linkmap[pathPart] === undefined) {
        console.error(`Error: Wiki link target "${pathPart}" not found in linkmap`); // TODO: file info
      }
      
      let resolvedPath = linkmap[pathPart] || '';
      
      if (anchorPart) {
        resolvedPath += `#${anchorPart}`;
      }
      
      match.text = display || pathPart;
      match.url = resolvedPath;
    }
  });
}

// 标签插件
// 属于 inline 规则
export function obsidianTags(md) {
  md.inline.ruler.push('obsidian_tag', (state, silent) => {
    const start = state.pos;
    
    if (state.src.charCodeAt(start) !== 0x23) return false;
    if (start > 0 && /\S/.test(state.src[start - 1])) return false;
    
    let pos = start + 1;
    let tagEnd = pos;
    
    // 匹配标签字符
    while (tagEnd < state.posMax && /[a-zA-Z0-9_\-/\u4e00-\u9fff]/.test(state.src[tagEnd])) {
      tagEnd++;
    }
    
    if (tagEnd === pos) return false;
    
    if (!silent) {
      const tagContent = state.src.slice(pos, tagEnd);
      const token = state.push('html_inline', '', 0);
      token.content = `<span class="tag" style="box-shadow: 0 1px 2px rgba(100, 100, 100, 0.3); border-radius: 3px; padding: 2px 4px;" data-tag="${tagContent}">#${tagContent}</span>`;
    }
    
    state.pos = tagEnd;
    return true;
  });
}

// 嵌入文件插件
// 属于 inline 规则
export function obsidianEmbeds(md, opts = {}) {
  let base = opts.base || '/';
  
  md.inline.ruler.push('obsidian_embeds', (state, silent) => {
    const start = state.pos;
    const max = state.posMax;
    
    // 检查是否以 ![[开头
    if (start + 3 >= max || 
        state.src.slice(start, start + 3) !== '![[') {
      return false;
    }
    
    // 查找结束标记 ]]
    const closePos = state.src.indexOf(']]', start + 3);
    if (closePos === -1) return false;
    
    // 提取嵌入路径
    const content = state.src.slice(start + 3, closePos).trim();
    if (!content) return false;
    
    if (!silent) {
      const isImage = /\.(png|jpe?g|gif|svg|webp|bmp)$/i.test(content);
      const resolvedPath = './attachments/' + content;
      
      let token;
      if (isImage) {
        //token = state.push('html_inline', '', 0);
        //token.content = `<img class="obsidian-embed-image" src="${resolvedPath}" alt="Embedded Image: ${content}" data-embed="${content}" style="max-width: 100%; height: auto;" />`;
       
        token = state.push('image', 'img', 0)
        const attrs = [['src', resolvedPath], ['alt', `Embedded Image: ${content}`], ['class', 'obsidian-embed-image']]
        token.attrs = attrs
        token.children = []
        token.content = content
      } else {
        token = state.push('html_inline', '', 0);
        token.content = `<div data-src="${resolvedPath}">Embedded: ${content} not an image.</div>`;
      }
    }
    
    state.pos = closePos + 2;
    return true;
  });
}