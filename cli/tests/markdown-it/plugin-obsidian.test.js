// tests/integration.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import MarkdownIt from 'markdown-it';
import { obsidianWikiLinks, obsidianTags, obsidianEmbeds } from '../../src/siteconfig/plugin-obsidian.js';

describe('Obsidian Markdown-it Plugins Integration Tests', () => {
  let md;
  
  const mockLinkmap = {
    'home': '/docs/home',
    'getting-started': '/docs/getting-started',
    '中文页面': '/docs/chinese-page',
    'api/reference': '/docs/api/reference',
    'sub-folder/nested': '/docs/sub-folder/nested'
  };

  const mockOpts = {
    base: '/docs/',
    linkmap: mockLinkmap
  };
  
  const mdconfig = {
    lineNumbers: true,
    anchor: {
      permalink: true,
      permalinkBefore: true,
      permalinkSymbol: '#',
    },
    html: true,       // 启用 HTML 标签
    breaks: true,     // 将 \n 转换为 <br>
    linkify: true,    // 自动将 URL 转换为链
  }

  beforeEach(() => {
    md = new MarkdownIt(mdconfig);
    obsidianWikiLinks(md, mockOpts);
    obsidianTags(md);
    obsidianEmbeds(md, mockOpts);
  });

  describe('Wiki Links Plugin', () => {
    const testCases = [
      {
        name: '简单 wiki 链接',
        input: '[[home]]',
        expected: '<p><a href="/docs/home">home</a></p>\n'
      },
      {
        name: '带显示文本的 wiki 链接',
        input: '[[home|首页]]',
        expected: '<p><a href="/docs/home">首页</a></p>\n'
      },
      {
        name: '带锚点的 wiki 链接',
        input: '[[getting-started#installation]]',
        expected: '<p><a href="/docs/getting-started#installation">getting-started</a></p>\n'
      },
      {
        name: '带 .md 扩展名的 wiki 链接',
        input: '[[home.md]]',
        expected: '<p><a href="/docs/home">home</a></p>\n'
      },
      {
        name: '中文 wiki 链接',
        input: '[[中文页面]]',
        expected: '<p><a href="/docs/chinese-page">中文页面</a></p>\n'
      },
      {
        name: '带斜杠的路径',
        input: '[[api/reference]]',
        expected: '<p><a href="/docs/api/reference">api/reference</a></p>\n'
      },
      {
        name: '复杂组合：锚点+显示文本',
        input: '[[getting-started#installation|安装指南]]',
        expected: '<p><a href="/docs/getting-started#installation">安装指南</a></p>\n'
      },
      {
        name: '不存在的链接（应该返回空路径）',
        input: '[[nonexistent]]',
        expected: '<p><a href="">nonexistent</a></p>\n'
      }
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(name, () => {
        const result = md.render(input);
        expect(result).toBe(expected);
      });
    });

    it('混合文本中的 wiki 链接', () => {
      const input = '这是一个 [[home|首页]] 链接，还有 [[getting-started]] 页面。';
      const result = md.render(input);
      expect(result).toBe('<p>这是一个 <a href="/docs/home">首页</a> 链接，还有 <a href="/docs/getting-started">getting-started</a> 页面。</p>\n');
    });
  });

  describe('Tags Plugin', () => {
    const testCases = [
      {
        name: '简单英文标签',
        input: '#tag',
        expected: '<p><span class="tag" style="box-shadow: 0 1px 2px rgba(100, 100, 100, 0.3); border-radius: 3px; padding: 2px 4px;" data-tag="tag">#tag</span></p>\n'
      },
      {
        name: '中文标签',
        input: '#中文标签',
        expected: '<p><span class="tag" style="box-shadow: 0 1px 2px rgba(100, 100, 100, 0.3); border-radius: 3px; padding: 2px 4px;" data-tag="中文标签">#中文标签</span></p>\n'
      },
      {
        name: '带连字符的标签',
        input: '#my-tag',
        expected: '<p><span class="tag" style="box-shadow: 0 1px 2px rgba(100, 100, 100, 0.3); border-radius: 3px; padding: 2px 4px;" data-tag="my-tag">#my-tag</span></p>\n'
      },
      {
        name: '带下划线的标签',
        input: '#my_tag',
        expected: '<p><span class="tag" style="box-shadow: 0 1px 2px rgba(100, 100, 100, 0.3); border-radius: 3px; padding: 2px 4px;" data-tag="my_tag">#my_tag</span></p>\n'
      },
      {
        name: '带斜杠的嵌套标签',
        input: '#category/subcategory',
        expected: '<p><span class="tag" style="box-shadow: 0 1px 2px rgba(100, 100, 100, 0.3); border-radius: 3px; padding: 2px 4px;" data-tag="category/subcategory">#category/subcategory</span></p>\n'
      }
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(name, () => {
        const result = md.render(input);
        expect(result).toBe(expected);
      });
    });

    it('多个标签', () => {
      const input = '#tag1 #tag2 #中文标签';
      const result = md.render(input);
      expect(result).toContain('data-tag="tag1"');
      expect(result).toContain('data-tag="tag2"');
      expect(result).toContain('data-tag="中文标签"');
    });

    it('行内标签不应该被识别', () => {
      const input = 'text#notag more text';
      const result = md.render(input);
      expect(result).toBe('<p>text#notag more text</p>\n');
    });
  });

  describe('Embeds Plugin', () => {
    const testCases = [
      {
        name: '图片嵌入',
        input: '![[image.png]]',
        expected: (result) => {
          expect(result).toContain('<img');
          expect(result).toContain('src="./attachments/image.png"');
          expect(result).toContain('class="obsidian-embed-image"');
          expect(result).toContain('alt="Embedded Image: image.png"');
        }
      },
      {
        name: 'JPEG 图片嵌入',
        input: '![[photo.jpg]]',
        expected: (result) => {
          expect(result).toContain('<img');
          expect(result).toContain('src="./attachments/photo.jpg"');
        }
      },
      {
        name: '非图片文件嵌入',
        input: '![[document.pdf]]',
        expected: (result) => {
          expect(result).toContain('<div data-src="./attachments/document.pdf"');
          expect(result).toContain('Embedded: document.pdf not an image.');
        }
      },
      {
        name: 'Markdown 文件嵌入',
        input: '![[notes.md]]',
        expected: (result) => {
          expect(result).toContain('<div data-src="./attachments/notes.md"');
          expect(result).toContain('Embedded: notes.md not an image.');
        }
      }
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(name, () => {
        const result = md.render(input);
        if (typeof expected === 'function') {
          expected(result);
        } else {
          expect(result).toBe(expected);
        }
      });
    });

    describe('图片嵌入 Token 结构测试', () => {
      it('PNG 图片 token 结构验证', () => {
        // 创建一个自定义的 markdown-it 实例来捕获 tokens
        const testMd = new MarkdownIt(mdconfig);
        obsidianEmbeds(testMd, mockOpts);
        
        const tokens = testMd.parse('![[test-image.png]]', {});
        
        // 找到 image token
        function findImageToken(tokens) {
          for (const token of tokens) {
            if (token.type === 'image') return token;
            if (token.children) {
              const found = findImageToken(token.children);
              if (found) return found;
            }
          }
          return undefined;
        }
        const imageToken = findImageToken(tokens);
        
        expect(imageToken).toBeDefined();
        expect(imageToken.type).toBe('image');
        expect(imageToken.tag).toBe('img');
        expect(imageToken.nesting).toBe(0);
        
        // 验证 attrs
        expect(imageToken.attrs).toBeDefined();
        expect(imageToken.attrs).toHaveLength(3);
        
        const attrsObj = Object.fromEntries(imageToken.attrs);
        expect(attrsObj.src).toBe('./attachments/test-image.png');
        expect(attrsObj.alt).toBe('Embedded Image: test-image.png');
        expect(attrsObj.class).toBe('obsidian-embed-image');
        
        // 验证其他属性
        expect(imageToken.children).toEqual([]);
        expect(imageToken.content).toBe('test-image.png');

        //const html = md.renderer.render(tokens, md.options, {});
        //console.log('rendered html', html);
      });
    });
  });

  describe('综合集成测试', () => {
    it('混合使用所有插件功能', () => {
      const input = `
# 标题

这是一个包含 [[home|首页]] 链接的段落。

![[image.png]]

标签: #documentation #中文标签

更多内容参见 [[getting-started#installation|安装指南]]。

![[document.pdf]]
      `.trim();

      const result = md.render(input);
      
      // 验证 wiki 链接
      expect(result).toContain('<a href="/docs/home">首页</a>');
      expect(result).toContain('<a href="/docs/getting-started#installation">安装指南</a>');
      
      // 验证标签
      expect(result).toContain('data-tag="documentation"');
      expect(result).toContain('data-tag="中文标签"');
      
      // 验证嵌入
      expect(result).toContain('src="./attachments/image.png"');
      expect(result).toContain('data-src="./attachments/document.pdf"');
    });

    it('边界情况测试', () => {
      const input = `
[[nonexistent]] - 不存在的链接
#invalid-chars! - 无效字符的标签（应该截止到感叹号前）
![[]] - 空嵌入（应该被忽略）
      `.trim();

      const result = md.render(input);
      
      // 不存在的链接应该返回空 href
      expect(result).toContain('<a href="">nonexistent</a>');
      
      // 无效字符应该被正确处理
      expect(result).toContain('data-tag="invalid-chars"');
      expect(result).not.toContain('data-tag="invalid-chars!"');
    });
  });

  describe('配置选项测试', () => {
    it('不同的 base 路径配置', () => {
      const customMd = new MarkdownIt(mdconfig);
      const customOpts = {
        base: '/custom/',
        linkmap: { 'test': '/custom/test-page' }
      };
      
      obsidianWikiLinks(customMd, customOpts);
      obsidianEmbeds(customMd, customOpts);
      
      const wikiResult = customMd.render('[[test]]');
      expect(wikiResult).toContain('href="/custom/test-page"');
      
      const embedResult = customMd.render('![[image.png]]');
      expect(embedResult).toContain('src="./attachments/image.png"');
    });

    it('空 linkmap 的处理', () => {
      const customMd = new MarkdownIt(mdconfig);
      const customOpts = {
        base: '/docs/',
        linkmap: {}
      };
      
      obsidianWikiLinks(customMd, customOpts);
      
      const result = customMd.render('[[unknown]]');
      expect(result).toContain('<a href="">unknown</a>');
    });
  });
});