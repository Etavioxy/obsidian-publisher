import fs from './utils/fs';
import * as path from 'path';
import * as tar from 'tar';
import archiver from 'archiver';

export interface ArchiveOptions {
  outputPath?: string;
  format?: 'tar' | 'zip';
}

export async function createArchive(buildDir: string, options: ArchiveOptions): Promise<string> {
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
    output.on('error', reject); 

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}