import { defineConfig } from 'vitepress';
import { obsidianPlugin } from './plugin-obsidian';
import * as path from 'path';

export default defineConfig({
  title: 'My Obsidian Vault',
  description: 'Published from Obsidian',
  
  ignoreDeadLinks: true,

  srcDir,
  srcExclude: excludePatterns,
  outDir: path.resolve(outputDir),
  
  vite: {
    plugins: [obsidianPlugin()]
  },
  
  markdown: {
    lineNumbers: true,
    //anchor: {
    //  permalink: true,
    //  permalinkBefore: true,
    //  permalinkSymbol: '#'
    //}
  },
  
  themeConfig: {
    nav,
    sidebar,
    
    search: {
      provider: 'local'
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ]
  }
});