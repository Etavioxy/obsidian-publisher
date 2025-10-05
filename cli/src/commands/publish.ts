import { buildSite } from './build';
import { createArchive } from './archive';
import { uploadSite } from './upload';
import * as fs from 'fs-extra';

interface PublishOptions {
  server: string;
  token?: string;
  srcDir: string;
  exclude: string[];
}

export async function publish(vaultPath: string, options: PublishOptions) {
  const tempBuildDir = './temp-build';
  const tempArchivePath = `./temp-archive-${Date.now()}.tar.gz`;
  
  try {
    // 1. 构建站点
    console.log('🏗️  Building site...');
    await buildSite(vaultPath, {
      output: tempBuildDir,
      srcDir: options.srcDir,
      exclude: options.exclude
    });
    
    // 2. 创建压缩包
    console.log('📦 Creating archive...');
    await createArchive(tempBuildDir, tempArchivePath);
    
    // 3. 上传
    console.log('📤 Uploading to server...');
    const result = await uploadSite(tempArchivePath, options.server, options.token);
    
    console.log(`🌐 Site available at: ${result.url}`);
    return result;
  } finally {
    // 清理临时文件
    await fs.remove(tempBuildDir).catch(() => {});
    await fs.remove(tempArchivePath).catch(() => {});
  }
}