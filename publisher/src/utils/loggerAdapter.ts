/**
 * Logger Adapter - 将 CLI logger 输出重定向到 CommandContext 回调
 * 让 CLI 的 build、pack、upload 命令的输出显示在 modal 中
 */

import { Logger } from 'obsidian-publisher-cli/lib';
import { CommandContext } from '../types';

export interface ProgressMapping {
	stage: string;
	startProgress: number;
	endProgress: number;
}

/**
 * 创建适配器 logger，将 CLI 的 logger 输出重定向到 CommandContext
 * @param context - 命令上下文，包含 onLog、onProgress、onError 回调
 * @param progressMapping - 可选的进度映射配置，用于将 0-100 的进度映射到指定范围
 */
export function createAdapterLogger(
	context?: CommandContext,
	progressMapping?: ProgressMapping
): Logger | undefined {
	if (!context) {
		return undefined;
	}

	const mapProgress = progressMapping
		? (progress: number) => {
			const range = progressMapping.endProgress - progressMapping.startProgress;
			return Math.round(progressMapping.startProgress + (progress / 100) * range);
		}
		: null;

	return {
		info: (message: string) => {
			context.onLog?.(message);
		},
		error: (message: string, ...args: any[]) => {
			context.onLog?.(`❌ ${message}`);
			if (args.length > 0 && args[0] instanceof Error) {
				context.onError?.(args[0]);
			}
		},
		warn: (message: string) => {
			context.onLog?.(`⚠️  ${message}`);
		},
		debug: (message: string) => {
			if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
				context.onLog?.(`🔍 ${message}`);
			}
		},
		success: (message: string) => {
			context.onLog?.(`✅ ${message}`);
		},
		progress: (message: string, progress?: number) => {
			if (mapProgress && typeof progress === 'number' && progress >= 0 && progress <= 100) {
				context.onProgress?.(progressMapping!.stage, mapProgress(progress), message);
			} else {
				context.onLog?.(message);
			}
		}
	};
}
