import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

interface SetupOptions {
  srcDir: string;
  exclude: string[];
}

export async function setupVitePressProject(
  vaultPath: string, 
  tempDir: string, 
  options: SetupOptions
) {
  // 1. 复制源文件
  await copySourceFiles(vaultPath, tempDir, options);
  
  // 2. 分析站点结构
  const structure = await analyzeSiteStructure(tempDir);
  
  // 3. 创建配置文件
  await createConfigFiles(tempDir, structure);
  
  // 4. 设置主题
  await setupTheme(tempDir);
}

async function copySourceFiles(vaultPath: string, tempDir: string, options: SetupOptions) {
  const srcPath = path.join(vaultPath, options.srcDir);
  const files = await glob('**/*', { 
    cwd: srcPath,
    ignore: options.exclude,
    nodir: true
  });
  
  for (const file of files) {
    const sourcePath = path.join(srcPath, file);
    const targetPath = path.join(tempDir, file);
    
    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(sourcePath, targetPath);
  }
}

interface SiteStructure {
  nav: Array<{ text: string; link: string; items?: Array<{ text: string; link: string }> }>;
  sidebar: Record<string, Array<{ text: string; link: string; items?: Array<{ text: string; link: string }> }>>;
  directories: Array<{ name: string; path: string; files: Array<{ name: string; path: string }> }>;
}

async function analyzeSiteStructure(docsDir: string): Promise<SiteStructure> {
  const markdownFiles = await glob('**/*.md', { cwd: docsDir });
  
  // 确保有 index.md
  await ensureIndexPage(docsDir, markdownFiles);
  
  // 分析目录结构
  const directories = analyzeDirectories(markdownFiles);
  
  // 构建导航
  const nav = buildNavigation(directories);
  
  // 构建侧边栏
  const sidebar = buildSidebar(directories);
  
  return { nav, sidebar, directories };
}

function analyzeDirectories(markdownFiles: string[]) {
  const dirMap = new Map<string, Array<{ name: string; path: string }>>();
  
  // 根目录文件
  const rootFiles = markdownFiles
    .filter(f => !f.includes('/'))
    .map(f => ({
      name: formatTitle(path.basename(f, '.md')),
      path: f.replace('.md', '')
    }));
  
  dirMap.set('root', rootFiles);
  
  // 子目录文件
  const subDirFiles = markdownFiles.filter(f => f.includes('/'));
  
  for (const file of subDirFiles) {
    const dirPath = path.dirname(file);
    const fileName = path.basename(file, '.md');
    
    if (!dirMap.has(dirPath)) {
      dirMap.set(dirPath, []);
    }
    
    dirMap.get(dirPath)!.push({
      name: formatTitle(fileName),
      path: file.replace('.md', '')
    });
  }
  
  return Array.from(dirMap.entries()).map(([dirPath, files]) => ({
    name: dirPath === 'root' ? 'Home' : formatTitle(path.basename(dirPath)),
    path: dirPath,
    files
  }));
}

async function ensureIndexPage(docsDir: string, markdownFiles: string[]) {
  const hasIndex = markdownFiles.some(f => 
    f === 'index.md' || f === 'README.md' || f.toLowerCase() === 'home.md'
  );
  
  if (!hasIndex) {
    // 分析目录结构生成首页
    const directories = analyzeDirectories(markdownFiles);
    const indexContent = generateIndexContent(directories);
    await fs.writeFile(path.join(docsDir, 'index.md'), indexContent);
  }
}

function generateIndexContent(directories: Array<{ name: string; path: string; files: Array<{ name: string; path: string }> }>): string {
  let content = `---
layout: home

hero:
  name: "My Knowledge Base"
  text: "Published from Obsidian"
  tagline: "Explore my notes and thoughts"
  actions:
    - theme: brand
      text: Start Reading
      link: /getting-started
    - theme: alt
      text: Browse All
      link: /browse

features:
`;

  // 添加特色功能
  const rootDir = directories.find(d => d.path === 'root');
  if (rootDir && rootDir.files.length > 0) {
    const featuredPages = rootDir.files.slice(0, 6);
    for (const page of featuredPages) {
      content += `  - title: "${page.name}"\n`;
      content += `    details: "Click to read more about ${page.name.toLowerCase()}"\n`;
      content += `    link: "/${page.path}"\n`;
    }
  }

  content += `---

## 📚 Browse by Category

`;

  // 添加目录浏览
  for (const dir of directories) {
    if (dir.path === 'root') continue;
    
    content += `### 📁 ${dir.name}\n\n`;
    
    const displayFiles = dir.files.slice(0, 5);
    for (const file of displayFiles) {
      content += `- [${file.name}](/${file.path})\n`;
    }
    
    if (dir.files.length > 5) {
      content += `- ... and ${dir.files.length - 5} more\n`;
    }
    
    content += `\n`;
  }

  // 添加所有页面列表
  content += `## 📋 All Pages\n\n`;
  const allFiles = directories.flatMap(d => d.files).sort((a, b) => a.name.localeCompare(b.name));
  
  for (const file of allFiles) {
    content += `- [${file.name}](/${file.path})\n`;
  }

  return content;
}

function buildNavigation(directories: Array<{ name: string; path: string; files: Array<{ name: string; path: string }> }>) {
  const nav = [
    { text: 'Home', link: '/' }
  ];
  
  // 添加主要目录到导航
  const mainDirs = directories.filter(d => d.path !== 'root' && d.files.length > 0);
  
  for (const dir of mainDirs.slice(0, 5)) { // 限制导航项数量
    if (dir.files.length === 1) {
      nav.push({
        text: dir.name,
        link: `/${dir.files[0].path}`
      });
    } else {
      nav.push({
        text: dir.name,
        items: dir.files.slice(0, 8).map(f => ({ // 限制下拉项数量
          text: f.name,
          link: `/${f.path}`
        }))
      });
    }
  }
  
  return nav;
}

function buildSidebar(directories: Array<{ name: string; path: string; files: Array<{ name: string; path: string }> }>) {
  const sidebar: Record<string, any> = {};
  
  for (const dir of directories) {
    if (dir.path === 'root') continue;
    
    const sidebarKey = `/${dir.path}/`;
    sidebar[sidebarKey] = [
      {
        text: dir.name,
        items: dir.files.map(f => ({
          text: f.name,
          link: `/${f.path}`
        }))
      }
    ];
  }
  
  return sidebar;
}

function formatTitle(filename: string): string {
  return filename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}

async function createConfigFiles(tempDir: string, structure: SiteStructure) {
  const configDir = path.join(tempDir, '.vitepress');
  await fs.ensureDir(configDir);
  
  // 创建 TypeScript 配置文件
  const configContent = `import { defineConfig } from 'vitepress';
import { obsidianPlugin } from './theme/obsidian-plugin';

export default defineConfig({
  title: 'My Knowledge Base',
  description: 'Published from Obsidian Vault',
  
  // 构建配置
  srcDir: '.',
  outDir: './dist',
  
  // Vite 配置
  vite: {
    plugins: [obsidianPlugin()]
  },
  
  // Markdown 配置
  markdown: {
    lineNumbers: true,
    anchor: {
      permalink: true,
      permalinkBefore: true,
      permalinkSymbol: '#'
    },
    toc: { level: [1, 2, 3] }
  },
  
  // 主题配置
  themeConfig: {
    nav: ${JSON.stringify(structure.nav, null, 4)},
    
    sidebar: ${JSON.stringify(structure.sidebar, null, 4)},
    
    // 搜索
    search: {
      provider: 'local',
      options: {
        detailedView: true
      }
    },
    
    // 社交链接
    socialLinks: [
      // { icon: 'github', link: 'https://github.com/your-repo' }
    ],
    
    // 页脚
    footer: {
      message: 'Generated from Obsidian Vault',
      copyright: 'Copyright © ${new Date().getFullYear()}'
    },
    
    // 编辑链接
    editLink: {
      pattern: 'https://github.com/your-repo/edit/main/:path',
      text: 'Edit this page'
    },
    
    // 最后更新时间
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'full',
        timeStyle: 'medium'
      }
    }
  }
});`;

  await fs.writeFile(path.join(configDir, 'config.ts'), configContent);
}

async function setupTheme(tempDir: string) {
  const themeDir = path.join(tempDir, '.vitepress', 'theme');
  await fs.ensureDir(themeDir);
  
  // 复制插件文件
  const pluginContent = await fs.readFile(
    path.join(__dirname, '../plugins/obsidian-plugin.ts'), 
    'utf-8'
  );
  await fs.writeFile(path.join(themeDir, 'obsidian-plugin.ts'), pluginContent);
  
  // 创建主题入口
  const themeContent = `import DefaultTheme from 'vitepress/theme';
import './custom.css';

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // 可以在这里注册全局组件
  }
};`;

  await fs.writeFile(path.join(themeDir, 'index.ts'), themeContent);
  
  // 创建自定义样式
  const cssContent = `/* Obsidian 样式增强 */

/* 标签样式 */
.tag {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 4px 4px 0;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-dark);
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
}

.tag:hover {
  background: var(--vp-c-brand);
  color: var(--vp-c-white);
  transform: translateY(-1px);
}

/* 嵌入文件样式 */
.embed-file {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  background: var(--vp-c-bg-soft);
  transition: border-color 0.2s;
}

.embed-file:hover {
  border-color: var(--vp-c-brand-soft);
}

/* 双链样式 */
.vp-doc a[href$=".html"] {
  color: var(--vp-c-brand);
  text-decoration: none;
  border-bottom: 1px dotted var(--vp-c-brand);
  transition: all 0.2s;
}

.vp-doc a[href$=".html"]:hover {
  border-bottom-style: solid;
  background: var(--vp-c-brand-soft);
  padding: 2px 4px;
  border-radius: 4px;
  margin: -2px -4px;
}

/* 首页增强 */
.VPHome .VPFeatures {
  margin-top: 2rem;
}

.VPFeature {
  transition: transform 0.2s, box-shadow 0.2s;
}

.VPFeature:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}

/* 目录浏览样式 */
.vp-doc h3:has(+ ul) {
  border-left: 4px solid var(--vp-c-brand);
  padding-left: 12px;
  margin-left: -16px;
}

/* 响应式优化 */
@media (max-width: 768px) {
  .tag {
    font-size: 0.75em;
    padding: 1px 6px;
  }
}`;

  await fs.writeFile(path.join(themeDir, 'custom.css'), cssContent);
}