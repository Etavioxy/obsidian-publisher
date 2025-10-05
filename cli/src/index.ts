#!/usr/bin/env node
import { Command } from 'commander';
import { buildSite } from './commands/build';
import { createArchive } from './commands/archive';
import { uploadSite } from './commands/upload';
import { publish } from './commands/publish';

const program = new Command();

program
  .name('obs-publish')
  .description('CLI tool for publishing Obsidian vaults')
  .version('1.0.0');

program
  .command('build')
  .description('Build Obsidian vault to static site')
  .argument('<vault-path>', 'Path to Obsidian vault')
  .option('-o, --output <path>', 'Output directory', './dist')
  .option('--src-dir <path>', 'Source directory within vault', '.')
  .option('--exclude <patterns...>', 'Exclude patterns', ['.obsidian/**', '.trash/**'])
  .action(async (vaultPath, options) => {
    try {
      await buildSite(vaultPath, options);
      console.log('✅ Site built successfully!');
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  });

program
  .command('archive')
  .description('Create archive from built site')
  .argument('<build-dir>', 'Built site directory')
  .option('-o, --output <path>', 'Archive output path')
  .action(async (buildDir, options) => {
    try {
      const archivePath = await createArchive(buildDir, options.output);
      console.log(`✅ Archive created: ${archivePath}`);
    } catch (error) {
      console.error('❌ Archive creation failed:', error);
      process.exit(1);
    }
  });

program
  .command('upload')
  .description('Upload archive to server')
  .argument('<archive-path>', 'Path to archive file')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:3000')
  .option('-t, --token <token>', 'Authentication token')
  .action(async (archivePath, options) => {
    try {
      const result = await uploadSite(archivePath, options.server, options.token);
      console.log(`✅ Upload successful! Site available at: ${result.url}`);
    } catch (error) {
      console.error('❌ Upload failed:', error);
      process.exit(1);
    }
  });

program
  .command('publish')
  .description('Build and upload site to server (complete workflow)')
  .argument('<vault-path>', 'Path to Obsidian vault')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:3000')
  .option('-t, --token <token>', 'Authentication token')
  .option('--src-dir <path>', 'Source directory within vault', '.')
  .option('--exclude <patterns...>', 'Exclude patterns', ['.obsidian/**', '.trash/**'])
  .action(async (vaultPath, options) => {
    try {
      await publish(vaultPath, options);
      console.log('✅ Site published successfully!');
    } catch (error) {
      console.error('❌ Publish failed:', error);
      process.exit(1);
    }
  });

program.parse();
