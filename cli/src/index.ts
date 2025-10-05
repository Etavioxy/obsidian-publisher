#!/usr/bin/env node
import { Command } from 'commander';
import { buildSite } from './builder';
import { uploadSite } from './uploader';

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
  .action(async (vaultPath, options) => {
    try {
      await buildSite(vaultPath, options.output);
      console.log('✅ Site built successfully!');
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  });

program
  .command('publish')
  .description('Build and upload site to server')
  .argument('<vault-path>', 'Path to Obsidian vault')
  .option('-s, --server <url>', 'Server URL', 'http://localhost:3000')
  .option('-t, --token <token>', 'Authentication token')
  .action(async (vaultPath, options) => {
    try {
      const outputDir = './build';
      await buildSite(vaultPath, outputDir);
      await uploadSite(outputDir, options.server, options.token);
      console.log('✅ Site published successfully!');
    } catch (error) {
      console.error('❌ Publish failed:', error);
      process.exit(1);
    }
  });

program.parse();
