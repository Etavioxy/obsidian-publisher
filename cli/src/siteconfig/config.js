import { obsidianWikiLinks, obsidianTags, obsidianEmbeds } from './plugin-obsidian.js';
import { configParams } from './config-params.js';
import * as path from 'path';

const {
  base,
  outputDir,
  srcDir,
  excludePatterns,
  nav,
  wikiLinkMap,
  sidebar
} = configParams;

export default {
  title: 'My Obsidian Vault',
  description: 'Published from Obsidian',
  
  ignoreDeadLinks: true,
  
  base: base,
  
  srcDir: srcDir,
  srcExclude: excludePatterns,
  outDir: path.resolve(outputDir),
  
  markdown: {
    lineNumbers: true,
    anchor: {
      permalink: true,
      permalinkBefore: true,
      permalinkSymbol: '#',
    },
    html: true,       // 启用 HTML 标签
    breaks: true,     // 将 \n 转换为 <br>
    linkify: true,    // 自动将 URL 转换为链接
    // 配置 markdown-it 实例
    config: (md) => {
      // 应用 Obsidian 插件

      md.use(obsidianWikiLinks, { base, linkmap: wikiLinkMap });
      md.use(obsidianTags);
      md.use(obsidianEmbeds, { base });
      
      // 其他 markdown-it 插件配置
      // md.use(require('markdown-it-footnote'));
      // md.use(require('markdown-it-task-lists'));
    }
  },
  
  themeConfig: {
    nav: nav,
    sidebar: sidebar,
    
    //search: {
    //  provider: 'local'
    //},
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Etavioxy/obsidian-publisher' }
    ],
    
    footer: {
      message: 'Generated from Obsidian vault',
      copyright: 'Copyright © 2024'
    }
  }
};