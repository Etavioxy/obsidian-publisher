import * as fs from 'fs-extra';
import * as fsp from 'fs/promises'
import * as path from 'path';
import { glob } from 'glob';
import { build, createContentLoader } from 'vitepress';

export async function buildSite(vaultPath: string, outputDir: string) {
  console.log(`🏗️  Building site from ${vaultPath}...`);
  
  const tempDir = path.join(process.cwd(), '.temp-vitepress');
  await fs.ensureDir(tempDir);
  
  // 1. 复制文档文件（保持原始格式）
  await copyVaultFiles(vaultPath, tempDir);
  
  // 2. 生成导航和侧边栏
  const siteStructure = await analyzeSiteStructure(tempDir);
  
  // 3. 创建 VitePress 配置
  await createVitePressConfig(tempDir, siteStructure);
  
  // 4. 构建站点
  await buildVitePress(tempDir, outputDir);
  
  // 5. 清理临时文件
  await fs.remove(tempDir);
}

async function copyVaultFiles(vaultPath: string, outputDir: string) {
  const files = await glob('**/*', { 
    cwd: vaultPath,
    ignore: ['.obsidian/**', '.trash/**'],
    nodir: true
  });
  
  for (const file of files) {
    const sourcePath = path.join(vaultPath, file);
    const targetPath = path.join(outputDir, file);
    
    await fs.ensureDir(path.dirname(targetPath));
    await fs.copy(sourcePath, targetPath);
  }
}

interface SiteStructure {
  nav: Array<{ text: string; link: string }>;
  sidebar: Record<string, Array<{ text: string; link: string }>>;
}

async function analyzeSiteStructure(docsDir: string): Promise<SiteStructure> {
  const markdownFiles = await glob('**/*.md', { cwd: docsDir });
  
  const nav: Array<{ text: string; link: string }> = [];
  const sidebar: Record<string, Array<{ text: string; link: string }>> = {};
  
  // 查找首页
  const hasIndex = markdownFiles.includes('index.md') || markdownFiles.includes('README.md');
  if (!hasIndex && markdownFiles.length > 0) {
    // 创建一个简单的首页
    const indexContent = `# Welcome\n\nThis site was generated from an Obsidian vault.\n`;
    await fsp.writeFile(path.join(docsDir, 'index.md'), indexContent);
  }
  
  // 构建导航
  const topLevelFiles = markdownFiles.filter(f => !f.includes('/'));
  for (const file of topLevelFiles) {
    if (file === 'index.md' || file === 'README.md') continue;
    
    const name = path.basename(file, '.md');
    nav.push({
      text: formatTitle(name),
      link: `/${file.replace('.md', '')}`
    });
  }
  
  // 构建侧边栏
  const directories = [...new Set(
    markdownFiles
      .filter(f => f.includes('/'))
      .map(f => f.split('/')[0])
  )];
  
  for (const dir of directories) {
    const dirFiles = markdownFiles
      .filter(f => f.startsWith(dir + '/'))
      .map(f => ({
        text: formatTitle(path.basename(f, '.md')),
        link: `/${f.replace('.md', '')}`
      }));
    
    sidebar[`/${dir}/`] = dirFiles;
  }
  
  return { nav, sidebar };
}

function formatTitle(filename: string): string {
  return filename
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

async function createVitePressConfig(docsDir: string, structure: SiteStructure) {
  const configDir = path.join(docsDir, '.vitepress');
  await fs.ensureDir(configDir);
  // #TODO why not use srcdir
  // https://vitepress.dev/reference/site-config#srcdir 
  // srcDir: './src' 
  
  const config = `
import { defineConfig } from 'vitepress';
import { obsidianPlugin } from '../../src/plugin-obsidian';

export default defineConfig({
  title: 'My Obsidian Vault',
  description: 'Published from Obsidian',

  ignoreDeadLinks: true,
  
  // 使用插件
  vite: {
    plugins: [obsidianPlugin()]
  },
  
  // Markdown 配置
  markdown: {
    // 启用行号
    lineNumbers: true,
    
    // 自定义锚点
    anchor: {
      permalink: true,
      permalinkBefore: true,
      permalinkSymbol: '#'
    }
  },
  
  themeConfig: {
    nav: ${JSON.stringify(structure.nav, null, 6)},
    sidebar: ${JSON.stringify(structure.sidebar, null, 6)},
    
    // 搜索配置
    search: {
      provider: 'local'
    },
    
    // 编辑链接
    editLink: {
      pattern: 'https://github.com/your-repo/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
});
`;
  
  await fsp.writeFile(path.join(configDir, 'config.js'), config);
}

async function buildVitePress(docsDir: string, outputDir: string) {
  await build(docsDir, { outDir: path.resolve(outputDir) });
}
