import fs from './utils/fs';
import * as path from 'path';
import * as tar from 'tar';
import archiver from 'archiver';

export interface ArchiveOptions {
  outputPath?: string;
  format?: 'tar' | 'zip';
}

export interface UploadOptions {
  serverUrl: string;
  token?: string;
}

export interface UploadResult {
  id: string;
  url: string;
  message: string;
}

export async function createArchive(buildDir: string, options: ArchiveOptions = {}): Promise<string> {
  const { format = 'tar', outputPath } = options;
  const timestamp = Date.now();
  const defaultPath = `./site-${timestamp}.${format === 'tar' ? 'tar.gz' : 'zip'}`;
  const archivePath = outputPath || defaultPath;
  
  console.log(`📦 Creating ${format} archive...`);
  
  if (format === 'tar') {
    await tar.create(
      {
        gzip: true,
        file: archivePath,
        cwd: buildDir
      },
      await fs.readdir(buildDir)
    );
  } else {
    await createZipArchive(buildDir, archivePath);
  }
  
  const stats = await fs.stat(archivePath);
  console.log(`📦 Archive created: ${archivePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  
  return path.resolve(archivePath);
}

async function createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => resolve());
    archive.on('error', reject);
    
    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

export async function uploadArchive(archivePath: string, options: UploadOptions): Promise<UploadResult> {
  const { serverUrl, token } = options;
  
  console.log(`📤 Uploading to ${serverUrl}...`);
  
  // 检查文件是否存在
  if (!await fs.pathExists(archivePath)) {
    throw new Error(`Archive file not found: ${archivePath}`);
  }
  
  const stats = await fs.stat(archivePath);
  console.log(`📤 Uploading ${(stats.size / 1024 / 1024).toFixed(2)} MB...`);
  
  // 创建 FormData
  const fileBuffer = await fs.readFile(archivePath);
  const fileName = path.basename(archivePath);
  
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)], { 
    type: fileName.endsWith('.tar.gz') ? 'application/gzip' : 'application/zip' 
  });
  formData.append('site', blob, fileName);
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${serverUrl}/api/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to server: ${serverUrl}`);
    }
    throw error;
  }
}