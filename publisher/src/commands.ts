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
} from './types';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';

const execAsync = promisify(exec);

async function runCli(args: string[], context?: CommandContext): Promise<{ stdout?: string; stderr?: string }> {
	const cliPath = path.resolve(__dirname, '../../cli/dist/index.js');
	const quoted = args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');
	const cmd = `node "${cliPath}" ${quoted}`;
	context?.onLog?.(`↪ Running: ${cmd}`);
	try {
		const { stdout, stderr } = await execAsync(cmd, { maxBuffer: 10 * 1024 * 1024 });
		if (stdout) context?.onLog?.(stdout.toString().trim());
		if (stderr) context?.onLog?.(stderr.toString().trim());
		return { stdout, stderr };
	} catch (err: any) {
		if (err.stdout) context?.onLog?.(err.stdout.toString().trim());
		if (err.stderr) context?.onLog?.(err.stderr.toString().trim());
		throw err;
	}
}

export async function build(options: BuildOptions, context?: CommandContext): Promise<CommandResult> {
	context?.onProgress?.('build', 0, 'Starting build');
	try {
		const args: string[] = ['build', options.vaultPath];
		if (options.outputDir) args.push('--output', options.outputDir);
		if (options.srcDir) args.push('--src-dir', options.srcDir);
		if (options.excludePatterns) options.excludePatterns.forEach((p) => args.push('--exclude', p));
		if (options.onlyTemp || options.optionTempDir) {
			if (options.optionTempDir) args.push('--only-temp', options.optionTempDir);
			else args.push('--only-temp', './temp-build');
		}

		const res = await runCli(args, context);
		context?.onProgress?.('build', 100, 'Build completed');
		return { success: true, message: 'Build completed', data: res.stdout };
	} catch (error: any) {
		context?.onError?.(error);
		return { success: false, message: String(error), error };
	}
}

export async function pack(options: PackOptions, context?: CommandContext): Promise<CommandResult> {
	context?.onProgress?.('pack', 0, 'Starting pack');
	try {
		const args: string[] = ['pack', options.buildDir];
		if (options.outputPath) args.push('--output', options.outputPath);
		if (options.format) args.push('--format', options.format);

		const res = await runCli(args, context);
		context?.onProgress?.('pack', 100, 'Pack completed');
		return { success: true, message: 'Pack completed', data: res.stdout };
	} catch (error: any) {
		context?.onError?.(error);
		return { success: false, message: String(error), error };
	}
}

export async function upload(options: UploadOptions, context?: CommandContext): Promise<CommandResult> {
	context?.onProgress?.('upload', 0, 'Starting upload');
	try {
		const args: string[] = ['upload', options.archivePath];
		if (options.serverUrl) args.push('--server', options.serverUrl);
		if (options.token) args.push('--token', options.token);
		if (options.metaPath) args.push('--meta', options.metaPath);

		const res = await runCli(args, context);
		context?.onProgress?.('upload', 100, 'Upload completed');
		return { success: true, message: 'Upload completed', data: res.stdout };
	} catch (error: any) {
		context?.onError?.(error);
		return { success: false, message: String(error), error };
	}
}

export async function publish(options: PublishOptions, context?: CommandContext): Promise<CommandResult> {
	context?.onProgress?.('publish', 0, 'Starting publish');
	try {
		const args: string[] = ['publish', options.vaultPath];
		if (options.serverUrl) args.push('--server', options.serverUrl);
		if (options.token) args.push('--token', options.token);
		if (options.excludePatterns) options.excludePatterns.forEach((p) => args.push('--exclude', p));
		if (options.keepTemp) args.push('--keep-temp');

		const res = await runCli(args, context);
		context?.onProgress?.('publish', 100, 'Publish completed');
		return { success: true, message: 'Publish completed', data: res.stdout };
	} catch (error: any) {
		context?.onError?.(error);
		return { success: false, message: String(error), error };
	} finally {
		// optional cleanup could be done here
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

// Backwards-compatible executor object expected by UI modules
export const CommandExecutor = {
	runCli,
	build,
	pack,
	upload,
	publish
};
