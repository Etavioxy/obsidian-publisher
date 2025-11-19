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
			context?.onLog?.('Starting build process...');
			context?.onProgress?.('build', 0, 'Preparing build environment');
			
			context?.onProgress?.('build', 30, 'Copying vault files');
			
			const _buildOpts: any = {
				outputDir: options.outputDir,
				srcDir: options.srcDir,
				excludePatterns: options.excludePatterns,
				onlyTemp: options.onlyTemp,
				optionTempDir: options.optionTempDir,
				basePath: options.basePath
			};
			context?.onLog?.(`vaultPath ${options.vaultPath} ; basePath ${options.basePath}`);
			await buildSite(options.vaultPath, _buildOpts);
			context?.onLog?.(`vaultPath ${options.vaultPath} ; basePath ${options.basePath}`);
			
			context?.onProgress?.('build', 100, 'Build completed');
			context?.onLog?.('✅ Site built successfully!');
			
			return {
				success: true,
				message: 'Build completed successfully',
				data: { outputDir: options.outputDir }
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			context?.onError?.(error as Error);
			context?.onLog?.(`❌ Build failed: ${errorMsg}`);
			
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
			context?.onLog?.('Starting pack process...');
			context?.onProgress?.('pack', 0, 'Creating archive');
			
			const archivePath = await createArchive(options.buildDir, {
				outputPath: options.outputPath,
				format: options.format || 'tar'
			});
			
			context?.onProgress?.('pack', 100, 'Archive created');
			context?.onLog?.(`✅ Archive created: ${archivePath}`);
			
			return {
				success: true,
				message: 'Archive created successfully',
				data: { archivePath }
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			context?.onError?.(error as Error);
			context?.onLog?.(`❌ Pack failed: ${errorMsg}`);
			
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
			context?.onLog?.('Starting upload process...');
			context?.onProgress?.('upload', 0, 'Uploading to server');
			
			const result: UploadResult = await uploadArchive(options.archivePath, {
				serverUrl: options.serverUrl,
				token: options.token,
				metaPath: options.metaPath
			});
			
			context?.onProgress?.('upload', 100, 'Upload completed');
			context?.onLog?.(`✅ Upload successful! Site URL: http://${result.url}`);
			
			return {
				success: true,
				message: 'Upload completed successfully',
				data: result
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			context?.onError?.(error as Error);
			context?.onLog?.(`❌ Upload failed: ${errorMsg}`);
			
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
			// Step 1: Build
			context?.onLog?.('📦 Step 1/3: Building site...');
			context?.onProgress?.('publish', 0, 'Building site');

			console.log('📦 Step 1/3: Building site...');
			console.log(options.basePath);
			
			const buildResult = await this.build({
				vaultPath: options.vaultPath,
				outputDir: tempBuildDir,
				excludePatterns: options.excludePatterns,
				basePath: options.basePath
			}, context);
			
			if (!buildResult.success) {
				throw new Error(buildResult.message);
			}
			
			// Step 2: Pack
			context?.onLog?.('📦 Step 2/3: Creating archive...');
			context?.onProgress?.('publish', 33, 'Creating archive');
			
			const packResult = await this.pack({
				buildDir: tempBuildDir,
				outputPath: tempArchive,
				format: 'tar'
			}, context);
			
			if (!packResult.success) {
				throw new Error(packResult.message);
			}
			
			// Step 3: Upload
			context?.onLog?.('📤 Step 3/3: Uploading to server...');
			context?.onProgress?.('publish', 66, 'Uploading');
			
			const uploadResult = await this.upload({
				archivePath: tempArchive,
				serverUrl: options.serverUrl,
				token: options.token,
				metaPath: `${tempBuildDir}/site-meta.json`
			}, context);
			
			if (!uploadResult.success) {
				throw new Error(uploadResult.message);
			}
			
			context?.onProgress?.('publish', 100, 'Publish completed');
			context?.onLog?.('✅ Site published successfully!');
			
			return {
				success: true,
				message: 'Site published successfully',
				data: uploadResult.data
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
