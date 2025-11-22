import fs from './utils/fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { analyzeSiteStructure, SiteStructure } from './site-structure';
import { generateIndexPage } from './index-page';
import { glob } from 'glob';
import { exec } from 'child_process';

export interface BuildOptions {
  outputDir: string;
  srcDir?: string;
  excludePatterns?: string[];
  onlyTemp?: boolean;
  optionTempDir?: string;
  // basePath is defined by the calling function
  basePath: string;
  siteConfigDir?: string;
}

export async function buildSite(vaultPath: string, options: BuildOptions) {
  console.log(`🏗️  Building site from ${vaultPath}...`);
  
  const {
    outputDir,
    srcDir = '.',
    excludePatterns = ['.obsidian/**', '.trash/**'],
    onlyTemp = false,
    optionTempDir = '.temp-vitepress',
    basePath,
    siteConfigDir = 'siteconfig'
  } = options as BuildOptions & { tempDir?: string };

  const resolutionBase = path.resolve(basePath);

  const tempDir = path.isAbsolute(optionTempDir) ? optionTempDir : path.join(resolutionBase, optionTempDir);
  const docsDir = path.join(tempDir, srcDir);
  const resolvedOutputDir = path.isAbsolute(outputDir) ? outputDir : path.join(resolutionBase, outputDir);
  const metaPath = path.join(resolvedOutputDir, 'site-meta.json');
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
    await copyVitePressConfig(basePath, tempDir, siteConfigDir);
    
    // 5. 生成动态配置
    await generateConfigParams(tempDir, {
      base: siteBase,
      outputDir: resolvedOutputDir,
      srcDir,
      excludePatterns,
      nav: siteStructure.nav,
      wikiLinkMap: siteStructure.wikiLinkMap,
      sidebar: siteStructure.sidebar
    } as ConfigParams);

    if (options.onlyTemp) { // If onlyTemp is true, skip
      console.log('ℹ️ Only generating temp files, skipping VitePress build and meta generation.');
      return;
    }
    
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

async function copyVitePressConfig(basePath: string, tempDir: string, siteConfigDir: string) {
  const configSourceDir = path.join(basePath, siteConfigDir);
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
  await new Promise((resolve, reject) => {
    /* hack install vue */
    exec(`pnpm init`, { cwd: root }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ init failed: ${stderr}`);
        reject(error);
      } else {
        console.log(`✅ init succeeded:\n${stdout}`);
        resolve(stdout);
      }
    });
  });
  await new Promise((resolve, reject) => {
    exec(`pnpm i vue`, { cwd: root }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ vue install failed: ${stderr}`);
        reject(error);
      } else {
        console.log(`✅ vue install succeeded:\n${stdout}`);
        resolve(stdout);
      }
    });
  });
  await new Promise((resolve, reject) => {
    exec(`npx vitepress build`, { cwd: root }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ VitePress build failed: ${stderr}`);
        reject(error);
      } else {
        console.log(`✅ VitePress build succeeded:\n${stdout}`);
        resolve(stdout);
      }
    });
  });
}

interface SiteMeta {
  version: string;
  siteId: string;
}

async function generateSiteMeta(metaPath: string, meta: SiteMeta) {
  await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  console.log(`📝 Generated site meta at ${metaPath}`);
}