/**
 * Logger utility for CLI and Plugin environments
 * CLI: Verbose logging with progress indicators
 * Plugin: Error-only logging by default
 */

export type LogLevel = 'info' | 'error' | 'warn' | 'debug' | 'success' | 'progress';

export interface ProgressContext {
  stage: string;
  onProgress?: (stage: string, progress: number, message?: string) => void;
}

export interface Logger {
  info(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  success(message: string, ...args: any[]): void;
  progress(message: string, progress?: number, context?: ProgressContext): void;
}

function isObsidianPlugin(): boolean {
  try {
    return typeof window !== 'undefined' &&
      typeof (window as any).app !== 'undefined' &&
      typeof (window as any).app.plugins !== 'undefined';
  } catch {
    return false;
  }
}

function isCLI(): boolean {
  return typeof process !== 'undefined' &&
    typeof process.versions !== 'undefined' &&
    typeof process.versions.node !== 'undefined' &&
    !isObsidianPlugin();
}

class CLILogger implements Logger {
  info(message: string, ...args: any[]): void {
    console.log(message, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`❌ ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`⚠️  ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log(`🔍 ${message}`, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    console.log(`✅ ${message}`, ...args);
  }

  progress(message: string, progress?: number, context?: ProgressContext): void {
    console.log(`${message}`);
    if (context?.onProgress && typeof progress === 'number') {
      context.onProgress(context.stage, progress, message);
    }
  }
}

class PluginLogger implements Logger {
  private showNotifications = false;

  constructor() {
    try {
      const app = (window as any).app;
      if (app && app.notice) {
        this.showNotifications = true;
      }
    } catch {
      // fallback
    }
  }

  info(message: string, ...args: any[]): void {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log(`ℹ️ ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    console.error(`❌ ${message}`, ...args);
    if (this.showNotifications) {
      try {
        (window as any).app.notice(`Error: ${message}`, 'error');
      } catch {
        // silent
      }
    }
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`⚠️  ${message}`, ...args);
    if (this.showNotifications) {
      try {
        (window as any).app.notice(`Warning: ${message}`, 'warning');
      } catch {
        // silent
      }
    }
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log(`🔍 ${message}`, ...args);
    }
  }

  success(message: string, ...args: any[]): void {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log(`✅ ${message}`, ...args);
    }
    if (this.showNotifications) {
      try {
        (window as any).app.notice(message, 'success');
      } catch {
        // silent
      }
    }
  }

  progress(message: string, progress?: number, context?: ProgressContext): void {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.log(`🔄 ${message}`);
    }
    if (context?.onProgress && typeof progress === 'number') {
      context.onProgress(context.stage, progress, message);
    }
  }
}

export function createLogger(): Logger {
  if (isObsidianPlugin()) return new PluginLogger();
  if (isCLI()) return new CLILogger();
  return new CLILogger();
}

class LoggerRegistry {
  private loggers: Map<string, Logger> = new Map();
  private currentLogger: Logger;
  private currentKey: string;

  constructor() {
    const defaultLogger = createLogger();
    this.currentLogger = defaultLogger;
    this.currentKey = 'default';
    this.loggers.set(this.currentKey, defaultLogger);
  }

  registerLogger(key: string, logger: Logger): void {
    this.loggers.set(key, logger);
  }

  switchLogger(key: string): boolean {
    const logger = this.loggers.get(key);
    if (logger) {
      this.currentLogger = logger;
      this.currentKey = key;
      return true;
    }
    return false;
  }

  getCurrentLogger(): Logger {
    return this.currentLogger;
  }

  getCurrentKey(): string {
    return this.currentKey;
  }

  getLoggerKeys(): string[] {
    return Array.from(this.loggers.keys());
  }

  hasLogger(key: string): boolean {
    return this.loggers.has(key);
  }

  removeLogger(key: string): boolean {
    if (key === 'default') return false;
    return this.loggers.delete(key);
  }
}

const loggerRegistry = new LoggerRegistry();

export const logger = loggerRegistry.getCurrentLogger();

export const loggerManager = {
  register: (key: string, loggerInstance: Logger): void => {
    loggerRegistry.registerLogger(key, loggerInstance);
  },

  switch: (key: string): boolean => {
    const success = loggerRegistry.switchLogger(key);
    if (success) (globalThis as any).currentLogger = loggerRegistry.getCurrentLogger();
    return success;
  },

  getCurrent: (): string => loggerRegistry.getCurrentKey(),

  getAvailable: (): string[] => loggerRegistry.getLoggerKeys(),

  has: (key: string): boolean => loggerRegistry.hasLogger(key),

  createCustom: (key: string, customLogger: Partial<Logger>): boolean => {
    const baseLogger = createLogger();
    const customInstance: Logger = {
      info: customLogger.info || baseLogger.info.bind(baseLogger),
      error: customLogger.error || baseLogger.error.bind(baseLogger),
      warn: customLogger.warn || baseLogger.warn.bind(baseLogger),
      debug: customLogger.debug || baseLogger.debug.bind(baseLogger),
      success: customLogger.success || baseLogger.success.bind(baseLogger),
      progress: customLogger.progress || baseLogger.progress.bind(baseLogger),
    };
    loggerRegistry.registerLogger(key, customInstance);
    return true;
  },

  /**
   * Register and immediately switch to a custom logger.
   * Returns the key used, or undefined if no custom logger provided.
   */
  useCustom: (customLogger?: Partial<Logger>, key?: string): string | undefined => {
    if (!customLogger) return undefined;
    const usedKey = key || `custom-${Date.now()}`;
    const baseLogger = createLogger();
    const customInstance: Logger = {
      info: customLogger.info || baseLogger.info.bind(baseLogger),
      error: customLogger.error || baseLogger.error.bind(baseLogger),
      warn: customLogger.warn || baseLogger.warn.bind(baseLogger),
      debug: customLogger.debug || baseLogger.debug.bind(baseLogger),
      success: customLogger.success || baseLogger.success.bind(baseLogger),
      progress: customLogger.progress || baseLogger.progress.bind(baseLogger),
    };
    loggerRegistry.registerLogger(usedKey, customInstance);
    const switched = loggerRegistry.switchLogger(usedKey);
    if (switched) {
      (globalThis as any).currentLogger = loggerRegistry.getCurrentLogger();
      return usedKey;
    }
    return undefined;
  }
};

export const log = {
  info: (message: string, ...args: any[]) => loggerRegistry.getCurrentLogger().info(message, ...args),
  error: (message: string, ...args: any[]) => loggerRegistry.getCurrentLogger().error(message, ...args),
  warn: (message: string, ...args: any[]) => loggerRegistry.getCurrentLogger().warn(message, ...args),
  debug: (message: string, ...args: any[]) => loggerRegistry.getCurrentLogger().debug(message, ...args),
  success: (message: string, ...args: any[]) => loggerRegistry.getCurrentLogger().success(message, ...args),
  progress: (message: string, progress?: number, context?: ProgressContext) => loggerRegistry.getCurrentLogger().progress(message, progress, context),
};
