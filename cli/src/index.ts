#!/usr/bin/env node
import { Command } from 'commander';
import { buildSite } from './builder';
import { createArchive, uploadArchive } from './uploader';
import fs from './utils/fs';
import * as path from 'path';

const program = new Command();

program
  .name('obs-publish')
  .description('CLI tool for publishing Obsidian vaults')
  .version('1.0.0');

// 构建命令
program
  .command('build')
  .description('Build Obsidian vault to static site')
  .argument('<vault-path>', 'Path to Obsidian vault')
  .option('-o, --output <path>', 'Output directory', './dist')
  .option('--src-dir <path>', 'VitePress source directory', '.')
  .option('--exclude <patterns...>', 'Exclude patterns', ['.obsidian/**', '.trash/**'])
  .action(async (vaultPath, options) => {
    try {
      await buildSite(vaultPath, {
        outputDir: options.output,
        srcDir: options.srcDir,
        excludePatterns: options.exclude
      });
      console.log('✅ Site built successfully!');
      console.log(`📁 Output: ${path.resolve(options.output)}`);
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  });

// 打包命令
program
  .command('pack')
  .description('Create archive from built site')
  .argument('<build-dir>', 'Built site directory')
  .option('-o, --output <path>', 'Archive output path')
  .option('-f, --format <format>', 'Archive format (tar|zip)', 'tar')
  .action(async (buildDir, options) => {
    try {
      const archivePath = await createArchive(buildDir, {
        outputPath: options.output,
        format: options.format
      });
      console.log('✅ Archive created successfully!');
      console.log(`📦 Archive: ${archivePath}`);
    } catch (error) {
      console.error('❌ Pack failed:', error);
      process.exit(1);
    }
  });

// 上传命令
program
  .command('upload')
  .description('Upload archive to server')
  .argument('<archive-path>', 'Path to archive file')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:3000')
  .option('-t, --token <token>', 'Authentication token')
  .action(async (archivePath, options) => {
    try {
      const result = await uploadArchive(archivePath, {
        serverUrl: options.server,
        token: options.token
      });
      console.log('✅ Archive uploaded successfully!');
      console.log(`🌐 Site URL: ${result.url}`);
    } catch (error) {
      console.error('❌ Upload failed:', error);
      process.exit(1);
    }
  });

// 一键发布命令
program
  .command('publish')
  .description('Build, pack and upload site to server')
  .argument('<vault-path>', 'Path to Obsidian vault')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:3000')
  .option('-t, --token <token>', 'Authentication token')
  .option('--exclude <patterns...>', 'Exclude patterns', ['.obsidian/**', '.trash/**'])
  .option('--keep-temp', 'Keep temporary files for debugging')
  .action(async (vaultPath, options) => {
    const tempBuildDir = './temp-build';
    const tempArchive = './temp-site.tar.gz';
    let publishError: any = null;

    try {
      // 0. 构建
      console.log('🏗️  Building site...');
      await buildSite(vaultPath, {
        outputDir: tempBuildDir,
        excludePatterns: options.exclude
      });
      
      // 2. 打包
      console.log('📦 Creating archive...');
      await createArchive(tempBuildDir, {
        outputPath: tempArchive,
        format: 'tar'
      });
      
      // 3. 上传
      console.log('📤 Uploading...');
      const result = await uploadArchive(tempArchive, {
        serverUrl: options.server,
        token: options.token
      });
      
      console.log('✅ Site published successfully!');
      console.log(`🌐 Site URL: ${result.url}`);
      
    } catch (error) {
      publishError = error;
      console.error('❌ Publish failed:', error);
    } finally {
      // 清理临时文件
      console.log('Cleaning:', tempBuildDir, tempArchive);
      if (!options.keepTemp) {
        await fs.remove(tempBuildDir).catch(() => {});
        await fs.remove(tempArchive).catch(() => {});
      }
    }
    if (publishError) {
      process.exit(1);
    }
  });

program.parse();
