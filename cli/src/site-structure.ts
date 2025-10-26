import * as path from 'path';
import { glob } from 'glob';

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
}

export interface SiteStructure {
  nav: Array<{ text: string; link: string }>;
  wikiLinkMap: Record<string, string>;
  sidebar: Record<string, Array<{ text: string; link: string; items?: Array<{ text: string; link: string }> }>>;
  fileTree: FileItem[];
}

export async function analyzeSiteStructure(docsDir: string): Promise<SiteStructure> {
  const markdownFiles = await glob('**/*.md', { cwd: docsDir });
  
  // 构建文件树
  const fileTree = buildFileTree(markdownFiles);
  
  // 构建导航
  const nav = buildNavigation(markdownFiles);

  // 构建wiki索引
  const wikiLinkMap = buildWikiLinkMap(markdownFiles);

  // 构建侧边栏
  const sidebar = buildSidebar(markdownFiles);
  
  return { nav, wikiLinkMap, sidebar, fileTree };
}

function buildFileTree(files: string[]): FileItem[] {
  const tree: FileItem[] = [];
  const dirMap = new Map<string, FileItem>();
  
  for (const file of files) {
    // support both POSIX and Windows paths (split on / or \\)
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
    text: path.basename(file, '.md').replace(/[-_]/g, ' '),
    link: `/${file.replace(/\\/g, '/').replace(/ /g, '%20').replace('.md', '')}`
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
      text: dir.replace(/[-_]/g, ' '),
      link: `/${dir}/`,
      items: dirFiles.map(f => ({
        text: path.basename(f, '.md').replace(/[-_]/g, ' '),
        link: `/${f.replace(/\\/g, '/').replace('.md', '')}`
      }))
    }];
  }
  
  return sidebar;
}