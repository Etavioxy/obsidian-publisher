import fs from './utils/fs';
import * as path from 'path';
import { build } from 'vitepress';
import { fileURLToPath } from 'url';
import { analyzeSiteStructure, SiteStructure } from './site-structure';
import { generateIndexPage } from './index-page';
import { glob } from 'glob';

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