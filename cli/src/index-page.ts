import fs from './utils/fs';
import * as path from 'path';
import { SiteStructure } from './site-structure';

export async function generateIndexPage(docsDir: string, structure: SiteStructure) {
  const indexPath = path.join(docsDir, 'index.md');
  const hasIndex = await fs.pathExists(indexPath);
  
  if (!hasIndex) {
    const indexContent = generateIndexContent(structure);
    await fs.writeFile(indexPath, indexContent);
  }
}

function generateIndexContent(structure: SiteStructure): string {
  const renderFileTree = (items: any[], level = 0): string => {
    return items.map(item => {
      const indent = '  '.repeat(level);
      if (item.type === 'directory') {
        return `${indent}- 📁 **${item.name}**\n${renderFileTree(item.children || [], level + 1)}`;
      } else {
        return `${indent}- 📄 [${item.name}](/${item.path.replace('.md', '').replace(/ /g, '%20')})`;
      }
    }).join('\n');
  };

  // see https://vitepress.dev/zh/reference/default-theme-home-page#hero-section
  return `---
layout: home

hero:
  name: "My Obsidian Vault"
  text: "Knowledge Base"
  tagline: "Organized thoughts and ideas"
  actions:
    - theme: brand
      text: Browse All Files
      link: #all-files

features:
  - title: 📚 Organized Knowledge
    details: All your notes organized and accessible
  - title: 🔍 Full-Text Search
    details: Find any content instantly
  - title: 🔗 Linked Thoughts
    details: Follow connections between ideas
---

## All Files {#all-files}

${renderFileTree(structure.fileTree)}

## Quick Navigation

${structure.nav.map(item => `- [${item.text}](${item.link})`).join('\n')}
`;
}
