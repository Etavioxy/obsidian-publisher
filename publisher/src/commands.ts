/**
 * CLI command execution module
 * Encapsulates all CLI operations (build, pack, upload, publish)
 */

import { Notice } from 'obsidian';
import {
	BuildOptions,
	PackOptions,
	UploadOptions,
	PublishOptions,
	CommandResult,
	CommandContext,
	UploadResult
} from './types';
import path from 'path';

// Import from library
import { buildSite, createArchive, uploadArchive } from 'obsidian-publisher-cli/lib';
import type { BuildOptions as CLIBuildOptions, ArchiveOptions as CLIArchiveOptions, UploadOptions as CLIUploadOptions } from 'obsidian-publisher-cli/lib';
import { createAdapterLogger } from './utils/loggerAdapter';

/**
 * Command executor class
 * Handles execution of CLI commands with progress tracking
 */
export class CommandExecutor {
	/**
	 * Execute build command
	 */
	static async build(
		options: BuildOptions,
		context?: CommandContext
	): Promise<CommandResult> {
		try {
			// 使用 customLogger 选项直接传递适配器 logger
			const adapterLogger = createAdapterLogger(context);

			await buildSite(options.vaultPath, {
				outputDir: options.outputDir,
				srcDir: options.srcDir,
				excludePatterns: options.excludePatterns,
				onlyTemp: options.onlyTemp,
				optionTempDir: options.optionTempDir,
				basePath: options.basePath,
				customLogger: adapterLogger,
				customLoggerKey: 'obsidian-build'
			} as CLIBuildOptions);

			return {
				success: true,
				message: 'Build completed successfully',
				data: { outputDir: options.outputDir }
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			context?.onError?.(error as Error);

			return {
				success: false,
				message: `Build failed: ${errorMsg}`,
				error: error as Error
			};
		}
	}
	
	/**
	 * Execute pack command
	 */
	static async pack(
		options: PackOptions,
		context?: CommandContext
	): Promise<CommandResult> {
		try {
			// 使用 customLogger 选项直接传递适配器 logger
			const adapterLogger = createAdapterLogger(context);

			const archivePath = await createArchive(options.buildDir, {
				outputPath: options.outputPath,
				format: options.format || 'tar',
				customLogger: adapterLogger,
				customLoggerKey: 'obsidian-pack'
			} as CLIArchiveOptions);

			return {
				success: true,
				message: 'Archive created successfully',
				data: { archivePath }
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			context?.onError?.(error as Error);

			return {
				success: false,
				message: `Pack failed: ${errorMsg}`,
				error: error as Error
			};
		}
	}
	
	/**
	 * Execute upload command
	 */
	static async upload(
		options: UploadOptions,
		context?: CommandContext
	): Promise<CommandResult> {
		try {
			// 使用 customLogger 选项直接传递适配器 logger
			const adapterLogger = createAdapterLogger(context);

			const result: UploadResult = await uploadArchive(options.archivePath, {
				serverUrl: options.serverUrl,
				token: options.token,
				siteName: options.siteName,
				metaPath: options.metaPath,
				customLogger: adapterLogger,
				customLoggerKey: 'obsidian-upload'
			} as CLIUploadOptions);

			return {
				success: true,
				message: 'Upload completed successfully',
				data: result
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			context?.onError?.(error as Error);

			return {
				success: false,
				message: `Upload failed: ${errorMsg}`,
				error: error as Error
			};
		}
	}
	
	/**
	 * Execute publish command (build + pack + upload)
	 */
	static async publish(
		options: PublishOptions,
		context?: CommandContext
	): Promise<CommandResult> {
		const tempBuildDir = path.join(options.basePath, './temp-build');
		const tempArchive = path.join(options.basePath, './temp-site.tar.gz');

		try {
			// Start publish operation
			context?.onLog?.('🚀 Starting publish process...');

			// Step 1: Build (0-30% of overall progress)
			context?.onLog?.('📦 Step 1/3: Building site...');
			context?.onProgress?.('build', 0, 'Starting build');

			// 使用带进度映射的适配器 logger
			const buildAdapterLogger = createAdapterLogger(context, { stage: 'build', startProgress: 0, endProgress: 40 });

			await buildSite(options.vaultPath, {
				outputDir: tempBuildDir,
				srcDir: undefined,
				excludePatterns: options.excludePatterns,
				onlyTemp: false,
				optionTempDir: undefined,
				basePath: options.basePath,
				customLogger: buildAdapterLogger,
				customLoggerKey: 'obsidian-publish-build'
			} as CLIBuildOptions);

			// Step 2: Pack (30-60% of overall progress)
			context?.onLog?.('📦 Step 2/3: Creating archive...');
			context?.onProgress?.('pack', 30, 'Starting archive creation');

			// 使用带进度映射的适配器 logger
			const packAdapterLogger = createAdapterLogger(context, { stage: 'pack', startProgress: 40, endProgress: 60 });

			const archivePath = await createArchive(tempBuildDir, {
				outputPath: tempArchive,
				format: 'tar',
				customLogger: packAdapterLogger,
				customLoggerKey: 'obsidian-publish-pack'
			} as CLIArchiveOptions);

			// Step 3: Upload (60-95% of overall progress)
			context?.onLog?.('📤 Step 3/3: Uploading to server...');
			context?.onProgress?.('upload', 60, 'Starting upload');

			// 使用带进度映射的适配器 logger
			const uploadAdapterLogger = createAdapterLogger(context, { stage: 'upload', startProgress: 60, endProgress: 100 });

			const result: UploadResult = await uploadArchive(tempArchive, {
				serverUrl: options.serverUrl,
				token: options.token,
				metaPath: `${tempBuildDir}/site-meta.json`,
				customLogger: uploadAdapterLogger,
				customLoggerKey: 'obsidian-publish-upload'
			} as CLIUploadOptions);

			context?.onProgress?.('publish', 100, 'Publish completed');
			context?.onLog?.('✅ Site published successfully!');

			return {
				success: true,
				message: 'Site published successfully',
				data: result
			};

		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			context?.onError?.(error as Error);
			context?.onLog?.(`❌ Publish failed: ${errorMsg}`);

			return {
				success: false,
				message: `Publish failed: ${errorMsg}`,
				error: error as Error
			};
		} finally {
			// Cleanup temp files
			if (!options.keepTemp) {
				context?.onLog?.('🧹 Cleaning up temporary files...');
				await this.cleanup(tempBuildDir, tempArchive);
			}
		}
	}
	
	/**
	 * Cleanup temporary files
	 */
	private static async cleanup(...paths: string[]): Promise<void> {
		// Use Node.js fs module for cleanup
		// In Obsidian plugin context, we need to be careful with file operations
		try {
			const fs = require('fs-extra');
			for (const path of paths) {
				try {
					await fs.remove(path);
				} catch (e) {
					console.warn(`Failed to remove ${path}:`, e);
				}
			}
		} catch (error) {
			console.warn('Cleanup failed:', error);
		}
	}
}

/**
 * Helper function to show notices with consistent styling
 */
export function showNotice(message: string, duration: number = 5000): void {
	new Notice(message, duration);
}

/**
 * Helper function to format error messages
 */
export function formatError(error: Error | string): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}
