import * as fs from 'fs-extra';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { arch } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

export async function uploadSite(buildDir: string, serverUrl: string, token?: string) {
  console.log(`📤 Uploading to ${serverUrl}...`);
  
  // 创建压缩包
  const archivePath = await createTarArchive(buildDir);
  
  // 上传到服务器
  const formData = new FormData();
  const fileBuffer = await fsp.readFile(archivePath);
  const blob = new Blob([fileBuffer], { type: 'application/zip' });
  formData.append('site', blob, 'site.zip');
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${serverUrl}/api/upload`, {
    method: 'POST',
    headers,
    body: formData
  });
  
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }
  
  // 清理临时文件
  await fs.remove(archivePath);
  
  const result = await response.json();
  console.log(`🌐 Site available at: ${result.url}`);
}

const execAsync = promisify(exec);

/**
 * 使用系统 tar 命令将指定文件夹打包为 .tar 文件
 * @param buildDir 要打包的文件夹的完整路径，比如：'/Users/name/project/docs'
 * @returns 返回生成的 tar 文件的完整路径，比如：'/project/site-123456789.tar'
 */
export async function createTarArchive(buildDir: string): Promise<string> {
  const timestamp = Date.now();
  const tarFileName = `site-${timestamp}.tar`;
  const tarFilePath = path.join(process.cwd(), tarFileName);

  const buildDirParent = path.dirname(buildDir);
  const buildDirName = path.basename(buildDir);

  // 构造命令：
  // tar -cf output.tar -C <buildDir的父目录> <buildDir的目录名>
  const command = `tar -cf "${tarFilePath}" -C "${buildDirParent}" "${buildDirName}"`;

  console.log(`🔧 执行 tar 命令: ${command}`);

  try {
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.warn('⚠️ tar 命令输出（可能是警告）:', stderr);
    }

    console.log(`✅ tar 文件已成功生成: ${tarFilePath}`);
    return tarFilePath;
  } catch (error) {
    console.error('❌ 调用系统 tar 命令失败:', error);
    throw error;
  }
}