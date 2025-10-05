import * as fs from 'fs-extra';
import * as path from 'path';
import * as tar from 'tar';

export async function createArchive(buildDir: string, outputPath?: string): Promise<string> {
  console.log(`📦 Creating archive from ${buildDir}...`);
  
  const archivePath = outputPath || path.join(process.cwd(), `site-${Date.now()}.tar.gz`);
  
  await tar.create(
    {
      gzip: true,
      file: archivePath,
      cwd: buildDir
    },
    ['.']
  );
  
  const stats = await fs.stat(archivePath);
  console.log(`📦 Archive created: ${archivePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
  
  return archivePath;
}