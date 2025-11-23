/**
 * Publisher Logger
 * Error-only logging for Obsidian plugin environment
 * Only shows error and warning messages in console by default
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'success' | 'progress';

export interface Logger {
	error(message: string, ...args: any[]): void;
	warn(message: string, ...args: any[]): void;
	info(message: string, ...args: any[]): void;
	debug(message: string, ...args: any[]): void;
	success(message: string, ...args: any[]): void;
	progress(message: string, ...args: any[]): void;
}

/**
 * Plugin Logger - Error-only by default
 * Only shows errors and warnings in console, others only in development
 */
class PluginLogger implements Logger {
	private showNotifications = false;

	constructor() {
		// Try to get Obsidian app for notifications
		try {
			const app = (window as any).app;
			if (app && app.notice) {
				this.showNotifications = true;
			}
		} catch {
			// Fallback to console only
		}
	}

	error(message: string, ...args: any[]): void {
		console.error(`❌ ${message}`, ...args);
		if (this.showNotifications) {
			try {
				(window as any).app.notice(`Error: ${message}`, 'error');
			} catch {
				// Silent fallback
			}
		}
	}

	warn(message: string, ...args: any[]): void {
		console.warn(`⚠️  ${message}`, ...args);
		if (this.showNotifications) {
			try {
				(window as any).app.notice(`Warning: ${message}`, 'warning');
			} catch {
				// Silent fallback
			}
		}
	}

	info(message: string, ...args: any[]): void {
		// Only show info in development
		if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
			console.log(`ℹ️ ${message}`, ...args);
		}
	}

	debug(message: string, ...args: any[]): void {
		// Only show debug in development
		if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
			console.log(`🔍 ${message}`, ...args);
		}
	}

	success(message: string, ...args: any[]): void {
		// Only show success in development or for debugging
		if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
			console.log(`✅ ${message}`, ...args);
		}
		if (this.showNotifications) {
			try {
				(window as any).app.notice(message, 'success');
			} catch {
				// Silent fallback
			}
		}
	}

	progress(message: string, ...args: any[]): void {
		// Only show progress in development
		if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
			console.log(`🔄 ${message}`, ...args);
		}
	}
}

/**
 * Create logger instance
 */
export function createLogger(): Logger {
	return new PluginLogger();
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Convenience exports for minimal code changes
 */
export const log = {
	error: (message: string, ...args: any[]) => logger.error(message, ...args),
	warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
	info: (message: string, ...args: any[]) => logger.info(message, ...args),
	debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
	success: (message: string, ...args: any[]) => logger.success(message, ...args),
	progress: (message: string, ...args: any[]) => logger.progress(message, ...args),
};