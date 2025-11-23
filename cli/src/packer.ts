import fs from './utils/fs';
import * as path from 'path';
import * as tar from 'tar';
import archiver from 'archiver';
import { log, loggerManager, Logger, ProgressContext } from './utils/logger';

export interface ArchiveOptions {
  outputPath?: string;
  format?: 'tar' | 'zip';
  progressContext?: ProgressContext;
  customLogger?: Partial<Logger>;
  customLoggerKey?: string;
}

export async function createArchive(buildDir: string, options: ArchiveOptions): Promise<string> {
  const originalLoggerKey = loggerManager.getCurrent();
  const switchedLoggerKey = loggerManager.useCustom(options.customLogger, options.customLoggerKey);

  const { format = 'tar', outputPath } = options;
  const timestamp = Date.now();
  const defaultPath = `./site-${timestamp}.${format === 'tar' ? 'tar.gz' : 'zip'}`;
  const archivePath = outputPath || defaultPath;
  
  log.progress(`📦 Creating ${format} archive...`, 0, options.progressContext);
  log.info('📁 Compressing files...', 50, options.progressContext);
  
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
  log.success(`📦 Archive created: ${archivePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  
  // Restore original logger
  if (switchedLoggerKey && loggerManager.getCurrent() !== originalLoggerKey) {
    loggerManager.switch(originalLoggerKey);
  }
  
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