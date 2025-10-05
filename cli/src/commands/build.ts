import * as fs from 'fs-extra';
import * as path from 'path';
import { build } from 'vitepress';
import { setupVitePressProject } from '../utils/vitepress-setup';

interface BuildOptions {
  output: string;
  srcDir: string;
  exclude: string[];
}

export async function buildSite(vaultPath: string, options: BuildOptions) {
  console.log(`🏗️  Building site from ${vaultPath}...`);
  
  const tempDir = path.join(process.cwd(), '.temp-vitepress');
  await fs.ensureDir(tempDir);
  
  try {
    // 1. 设置 VitePress 项目结构
    await setupVitePressProject(vaultPath, tempDir, options);
    
    // 2. 构建站点
    await build(tempDir, { 
      outDir: path.resolve(options.output),
      srcDir: options.srcDir
    });
    
    console.log(`📦 Site built to: ${options.output}`);
  } finally {
    // 清理临时文件
    await fs.remove(tempDir);
  }
}