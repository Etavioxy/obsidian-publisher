import { defineConfig } from 'vitepress';
import { obsidianPlugin } from './plugin-obsidian.js';
import { configParams } from './config-params.js';
import * as path from 'path';

const {
  outputDir,
  srcDir,
  excludePatterns,
  nav,
  sidebar
} = configParams;

export default defineConfig({
  title: 'My Obsidian Vault',
  description: 'Published from Obsidian',
  
  ignoreDeadLinks: true,
  
  base: '.',
  
  srcDir: srcDir,
  srcExclude: excludePatterns,
  outDir: path.resolve(outputDir),
  
  vite: {
    plugins: [obsidianPlugin()]
  },
  
  markdown: {
    lineNumbers: true,
    anchor: {
      permalink: true,
      permalinkBefore: true,
      permalinkSymbol: '#'
    }
  },
  
  themeConfig: {
    nav: nav,
    sidebar: sidebar,
    
    search: {
      provider: 'local'
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],
    
    footer: {
      message: 'Generated from Obsidian vault',
      copyright: 'Copyright © 2024'
    }
  }
});