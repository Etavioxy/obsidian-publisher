// 处理双链（Wiki 链接）语法 [[...]] 的插件
// 属于 inline ruler linkify 规则
// see https://github.com/binyamin/markdown-it-wikilinks/blob/main/index.js 
// 逻辑说明：解析 [[目标|显示名]]、[[目标#锚点|显示名]] 或 [[目标]] 形式的文本。
// - 将原始目标拆分为路径和锚点
// - 使用外部的 linkmap 来解析到最终 url（若存在映射）
// - 将显示名设置为链接文本（若提供显示名则使用显示名，否则使用路径）
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

// 标签识别插件
// 属于 inline 规则
// 逻辑说明：识别以 # 开头的标签（如 #tag），当前字符左侧为空白或行首时触发。
// - 扫描后续合法标签字符（字母、数字、下划线、连接符、中文等）作为标签内容
// - 如果识别到标签则输出一个内联 html token，携带 data-tag 属性，供样式或后续处理使用
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

// 嵌入文件（Embed）插件
// 属于 inline 以及 renderer 规则
// 逻辑说明：识别 Obsidian 风格的嵌入语法 ![[path]]，并根据目标类型生成不同的 token：
// - 如果目标是图片文件（根据扩展名判断），则生成标准的 image token，保留 src、alt 与 class 等属性，后续渲染器负责最终 html 输出
// - 如果目标不是图片，则生成一个 html_inline 占位节点，包含 data-src 指向被嵌入的资源
// 同时，覆盖 image 渲染器的行为以确保渲染时能使用 token 中可能提供的 alt 属性（逻辑上优先使用 token.attrs 中的 alt）
export function obsidianEmbeds(md, opts = {}) {
  let base = opts.base || '/';

  // 保存并覆盖 image 渲染器：逻辑上只是确保最终输出中使用 token 上的 alt 属性（若存在）
  const defaultImageRenderer = md.renderer.rules.image;
  md.renderer.rules.image = function(tokens, idx, options, env, self) {
    const token = tokens[idx];

    const attrsMap = Object.fromEntries(token.attrs);

    let result = '';
    // 调用原始渲染器以获得基础 HTML（如果存在），渲染器会使用 token.attrs
    if (typeof defaultImageRenderer === 'function') {
      result = defaultImageRenderer(tokens, idx, options, env, self);
    }

    // 如果 token 指定了 alt，则把渲染结果中的空 alt 替换为该值（逻辑：使用 token 提供的 alt 优先）
    if (attrsMap.alt) {
      result = result.replace(/alt=""/, `alt="${attrsMap.alt}"`);
    }
    return result;
  };

  // 注册内联解析规则：识别以 '![[' 开头并在后续找到 ']]' 结束的嵌入语法
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
        // 生成一个 image token：逻辑上填充 src、alt、class，渲染器会把它转成 <img>
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