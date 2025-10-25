import fs from './utils/fs';
import * as path from 'path';
import { glob } from 'glob';
import { build } from 'vitepress';
import { fileURLToPath } from 'url';

export interface BuildOptions {
  outputDir: string;
  srcDir?: string;
  excludePatterns?: string[];
  onlyTemp?: boolean;
  optionTempDir?: string;
}

export async function buildSite(vaultPath: string, options: BuildOptions) {
  console.log(`🏗️  Building site from ${vaultPath}...`);
  
  const {
    outputDir,
    srcDir = '.',
    excludePatterns = ['.obsidian/**', '.trash/**'],
    onlyTemp = false,
    optionTempDir = '.temp-vitepress'
  } = options as BuildOptions & { tempDir?: string };

  const tempDir = path.join(process.cwd(), optionTempDir);
  const docsDir = path.join(tempDir, srcDir);
  const metaPath = path.join(outputDir, 'site-meta.json');
  const siteId = crypto.randomUUID();
  const siteBase = onlyTemp ? '/' : `/sites/${siteId}/`;
  
  // If onlyTemp is requested and tempDir already exists, skip regeneration
  if (onlyTemp && await fs.pathExists(tempDir)) {
    console.log(`🟡 Temp directory already exists at ${tempDir}. Skipping generation as requested.`);
    return;
  }

  await fs.ensureDir(docsDir);
  // 检查docsDir是否为空目录
  if ((await fs.readdir(docsDir)).length > 0) {
    throw new Error(`The source directory (${docsDir}) is not empty. Please ensure it is empty before building the site.`);
  }

  try {
    // 1. 复制文档文件
    await copyVaultFiles(vaultPath, docsDir, excludePatterns);
    
    // 2. 生成站点结构
    const siteStructure = await analyzeSiteStructure(docsDir);
    
    // 3. 生成首页
    await generateIndexPage(docsDir, siteStructure);
    
    // 4. 复制 VitePress 配置文件夹
    await copyVitePressConfig(tempDir);
    
    // 5. 生成动态配置
    await generateConfigParams(tempDir, {
      base: siteBase,
      outputDir,
      srcDir,
      excludePatterns,
      nav: siteStructure.nav,
      wikiLinkMap: siteStructure.wikiLinkMap,
      sidebar: siteStructure.sidebar
    } as ConfigParams);

    if (options.onlyTemp) return; // If onlyTemp is true, skip
    
    // 6. 直接调用 VitePress 构建
    await buildWithVitePress(tempDir);
    
    // 7. 生成 meta 信息
    await generateSiteMeta(metaPath, {
      version: 'v0',
      siteId: siteId,
    } as SiteMeta);

    // 8. 清理临时文件
    await fs.remove(tempDir);
  } catch (error) {
    // 失败，清理临时文件
    await fs.remove(tempDir);
    throw error;
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
  wikiLinkMap: Record<string, string>;
  sidebar: Record<string, Array<{ text: string; link: string; items?: Array<{ text: string; link: string }> }>>;
  fileTree: FileItem[];
}

async function analyzeSiteStructure(docsDir: string): Promise<SiteStructure> {
  const markdownFiles = await glob('**/*.md', { cwd: docsDir });
  
  // 构建文件树
  const fileTree = buildFileTree(markdownFiles);
  
  // 构建导航
  const nav = buildNavigation(markdownFiles);

  // 构建wiki索引
  const wikiLinkMap = buildWikiLinkMap(markdownFiles);
  console.log('🔍 Generated wiki index:', markdownFiles, wikiLinkMap);

  // 构建侧边栏
  const sidebar = buildSidebar(markdownFiles);
  
  return { nav, wikiLinkMap, sidebar, fileTree };
}

function buildFileTree(files: string[]): FileItem[] {
  const tree: FileItem[] = [];
  const dirMap = new Map<string, FileItem>();
  
  for (const file of files) {
    // support both POSIX and Windows paths (split on / or \)
    const parts = file.split(/[/\\]+/);
    let currentPath = '';
    let currentLevel = tree;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      
      if (isLast) {
        currentLevel.push({
          name: part.replace('.md', ''),
          path: file,
          type: 'file'
        });
      } else {
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
  const topLevelFiles = files.filter(f => !/[/\\]/.test(f) && f !== 'index.md');
  return topLevelFiles.slice(0, 8).map(file => ({
    text: formatTitle(path.basename(file, '.md')),
    link: `/${file.replace(/\\/g, '/').replace('.md', '')}`
  }));
}

function buildWikiLinkMap(files: string[]): Record<string, string> {
  const wikiLinkMap: Record<string, string> = {};
  
  for (const file of files) {
    const title = path.basename(file, '.md');
    wikiLinkMap[title] = `/${file.replace(/\\/g, '/').replace('.md', '')}`;
  }
      
  return wikiLinkMap;
}

function buildSidebar(files: string[]): Record<string, Array<{ text: string; link: string; items?: Array<{ text: string; link: string }> }>> {
  const sidebar: Record<string, Array<{ text: string; link: string; items?: Array<{ text: string; link: string }> }>> = {};
  
  const directories = [...new Set(
    files
      .filter(f => /[/\\]/.test(f))
      .map(f => f.split(/[/\\]+/)[0])
  )];
  
  for (const dir of directories) {
    const dirFiles = files.filter(f => f.startsWith(dir + '/') || f.startsWith(dir + '\\'));

    sidebar[`/${dir}/`] = [{
      text: formatTitle(dir),
      link: `/${dir}/`,
      items: dirFiles.map(f => ({
        text: formatTitle(path.basename(f, '.md')),
        link: `/${f.replace(/\\/g, '/').replace('.md', '')}`
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

async function copyVitePressConfig(tempDir: string) {
  // 在 ES Module 环境下模拟 __dirname
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const configSourceDir = path.join(__dirname, 'siteconfig');
  const configTargetDir = path.join(tempDir, '.vitepress');
  
  // 复制整个配置目录
  await fs.copy(configSourceDir, configTargetDir);
  
  console.log(`📝 Copied VitePress config from ${configSourceDir} to ${configTargetDir}`);
}

interface ConfigParams {
  base: string;
  outputDir: string;
  srcDir: string;
  excludePatterns: string[];
  nav: Array<{ text: string; link: string }>;
  wikiLinkMap: Record<string, string>;
  sidebar: Record<string, any>;
}

async function generateConfigParams(tempDir: string, params: ConfigParams) {
  const configParamsPath = path.join(tempDir, '.vitepress', 'config-params.js');
  
  // 生成参数文件
  const configParamsContent = `// 动态生成的配置参数
export const configParams = ${JSON.stringify(params, null, 2)};
`;
  
  await fs.writeFile(configParamsPath, configParamsContent);
  console.log('📝 Generated config parameters');
}

async function buildWithVitePress(root: string) {
  console.log(`🔨 Building with VitePress from ${root}...`);
  await build(root);
}

interface SiteMeta {
  version: string;
  siteId: string;
}

async function generateSiteMeta(metaPath: string, meta: SiteMeta) {
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  console.log(`📝 Generated site meta at ${metaPath}`);
}

function formatTitle(filename: string): string {
  return filename
    .replace(/[-_]/g, ' ');
    //.replace(/\b\w/g, l => l.toUpperCase());
}