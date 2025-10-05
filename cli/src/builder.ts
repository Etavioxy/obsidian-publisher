import fs from './utils/fs';
import * as path from 'path';
import { glob } from 'glob';
import { build, UserConfig } from 'vitepress';
import { makeConfig } from './siteconfig/config';

export interface BuildOptions {
  outputDir: string;
  srcDir?: string;
  excludePatterns?: string[];
}

export async function buildSite(vaultPath: string, options: BuildOptions) {
  console.log(`🏗️  Building site from ${vaultPath}...`);
  
  const {
    outputDir,
    srcDir = '.',
    excludePatterns = ['.obsidian/**', '.trash/**']
  } = options;
  
  const tempDir = path.join(process.cwd(), '.temp-vitepress');
  const docsDir = path.join(tempDir, srcDir);
  
  await fs.ensureDir(docsDir);
  
  try {
    // 1. 复制文档文件
    await copyVaultFiles(vaultPath, docsDir, excludePatterns);
    
    // 2. 生成站点结构
    const siteStructure = await analyzeSiteStructure(docsDir);
    
    // 3. 生成首页
    await generateIndexPage(docsDir, siteStructure);
    
    // 4. 创建 VitePress 配置目录和主题
    await createVitePressConfig(tempDir);
    
    // 5. 直接调用 VitePress 构建
    await buildWithVitePress(tempDir, makeConfig(outputDir, srcDir, excludePatterns, siteStructure.nav, siteStructure.sidebar));
    
  } finally {
    // 清理临时文件
    //await fs.remove(tempDir);
  }
}

async function copyVaultFiles(vaultPath: string, outputDir: string, excludePatterns: string[]) {
  const files = await glob('**/*', { 
    cwd: vaultPath,
    ignore: excludePatterns,
    nodir: true
  });
  
  for (const file of files) {
    const sourcePath = path.join(vaultPath, file);
    const targetPath = path.join(outputDir, file);
    
    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(sourcePath, targetPath);
  }
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
}

interface SiteStructure {
  nav: Array<{ text: string; link: string }>;
  sidebar: Record<string, Array<{ text: string; link: string; items?: Array<{ text: string; link: string }> }>>;
  fileTree: FileItem[];
}

async function analyzeSiteStructure(docsDir: string): Promise<SiteStructure> {
  const markdownFiles = await glob('**/*.md', { cwd: docsDir });
  
  // 构建文件树
  const fileTree = buildFileTree(markdownFiles);
  
  // 构建导航
  const nav = buildNavigation(markdownFiles);
  
  // 构建侧边栏
  const sidebar = buildSidebar(markdownFiles);
  
  return { nav, sidebar, fileTree };
}

function buildFileTree(files: string[]): FileItem[] {
  const tree: FileItem[] = [];
  const dirMap = new Map<string, FileItem>();
  
  for (const file of files) {
    const parts = file.split('/');
    let currentPath = '';
    let currentLevel = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (isLast) {
        // 文件
        currentLevel.push({
          name: part.replace('.md', ''),
          path: file,
          type: 'file'
        });
      } else {
        // 目录
        let dir = dirMap.get(currentPath);
        if (!dir) {
          dir = {
            name: part,
            path: currentPath,
            type: 'directory',
            children: []
          };
          dirMap.set(currentPath, dir);
          currentLevel.push(dir);
        }
        currentLevel = dir.children!;
      }
    }
  }
  
  return tree;
}

function buildNavigation(files: string[]): Array<{ text: string; link: string }> {
  const topLevelFiles = files.filter(f => !f.includes('/') && f !== 'index.md');
  return topLevelFiles.slice(0, 8).map(file => ({
    text: formatTitle(path.basename(file, '.md')),
    link: `/${file.replace('.md', '')}`
  }));
}

function buildSidebar(files: string[]): Record<string, Array<{ text: string; link: string; items?: Array<{ text: string; link: string }> }>> {
  const sidebar: Record<string, Array<{ text: string; link: string; items?: Array<{ text: string; link: string }> }>> = {};
  
  const directories = [...new Set(
    files
      .filter(f => f.includes('/'))
      .map(f => f.split('/')[0])
  )];
  
  for (const dir of directories) {
    const dirFiles = files.filter(f => f.startsWith(dir + '/'));
    
    sidebar[`/${dir}/`] = [{
      text: formatTitle(dir),
      link: `/${dir}/`,
      items: dirFiles.map(f => ({
        text: formatTitle(path.basename(f, '.md')),
        link: `/${f.replace('.md', '')}`
      }))
    }];
  }
  
  return sidebar;
}

async function generateIndexPage(docsDir: string, structure: SiteStructure) {
  const indexPath = path.join(docsDir, 'index.md');
  const hasIndex = await fs.pathExists(indexPath);
  
  if (!hasIndex) {
    const indexContent = generateIndexContent(structure);
    await fs.writeFile(indexPath, indexContent);
  }
}

function generateIndexContent(structure: SiteStructure): string {
  const renderFileTree = (items: FileItem[], level = 0): string => {
    return items.map(item => {
      const indent = '  '.repeat(level);
      if (item.type === 'directory') {
        return `${indent}- 📁 **${item.name}**\n${renderFileTree(item.children || [], level + 1)}`;
      } else {
        return `${indent}- 📄 [${item.name}](/${item.path.replace('.md', '')})`;
      }
    }).join('\n');
  };

  const renderNav = () => {
    return structure.nav.map(item => `- [${item.text}](${item.link})`).join('\n');
  }

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

${renderNav()}
`;
}

async function createVitePressConfig(
  root: string, 
  config: UserConfig,
) {
  console.log('root:', root);
  await build(root);
}

async function buildWithVitePress(
  root: string, 
  config: UserConfig,
) {
  console.log('root:', root);
  await build(root);
}

function formatTitle(filename: string): string {
  return filename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}
