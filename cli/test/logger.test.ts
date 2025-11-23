/**
 * Logger functionality unit tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createLogger,
  loggerManager,
  log,
  Logger,
  ProgressContext
} from '../src/utils/logger.js';

// Mock console methods
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
};

// Mock process.env
const originalEnv = process.env;

describe('Logger Functionality', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    Object.values(consoleSpy).forEach(spy => spy.mockClear());

    // Reset to default logger before each test
    loggerManager.switch('default');
  });

  afterEach(() => {
    // Restore process.env
    process.env = originalEnv;

    // Clean up any custom loggers
    const availableLoggers = loggerManager.getAvailable();
    availableLoggers.forEach(key => {
      if (key !== 'default') {
        loggerManager.switch('default');
        // Note: We don't have a direct way to remove loggers, so we just switch back to default
      }
    });
  });

  describe('Default Logger Creation', () => {
    it('should create a logger instance', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.success).toBe('function');
      expect(typeof logger.progress).toBe('function');
    });

    it('should have default logger registered', () => {
      expect(loggerManager.has('default')).toBe(true);
      expect(loggerManager.getCurrent()).toBe('default');
    });

    it('should include default in available loggers', () => {
      const available = loggerManager.getAvailable();
      expect(available).toContain('default');
    });
  });

  describe('Logger Registration and Switching', () => {
    it('should register a new logger', () => {
      const customLogger: Logger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        success: vi.fn(),
        progress: vi.fn(),
      };

      loggerManager.register('custom', customLogger);

      expect(loggerManager.has('custom')).toBe(true);
      expect(loggerManager.getAvailable()).toContain('custom');
    });

    it('should switch to a registered logger', () => {
      const customLogger: Logger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        success: vi.fn(),
        progress: vi.fn(),
      };

      loggerManager.register('custom', customLogger);
      const switchResult = loggerManager.switch('custom');

      expect(switchResult).toBe(true);
      expect(loggerManager.getCurrent()).toBe('custom');
    });

    it('should fail to switch to non-existent logger', () => {
      const switchResult = loggerManager.switch('non-existent');

      expect(switchResult).toBe(false);
      expect(loggerManager.getCurrent()).toBe('default');
    });

    it('should create and register custom logger', () => {
      const customInfo = vi.fn();
      const customError = vi.fn();

      const success = loggerManager.createCustom('partial-custom', {
        info: customInfo,
        error: customError,
      });

      expect(success).toBe(true);
      expect(loggerManager.has('partial-custom')).toBe(true);

      loggerManager.switch('partial-custom');
      log.info('test info');
      log.error('test error');

      expect(customInfo).toHaveBeenCalledWith('test info');
      expect(customError).toHaveBeenCalledWith('test error');
    });
  });

  describe('Log Output Redirection', () => {
    it('should redirect to custom logger after switching', () => {
      const customLogger: Logger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        success: vi.fn(),
        progress: vi.fn(),
      };

      loggerManager.register('test', customLogger);
      loggerManager.switch('test');

      log.info('Test info message');
      log.error('Test error message');
      log.warn('Test warn message');
      log.debug('Test debug message');
      log.success('Test success message');

      expect(customLogger.info).toHaveBeenCalledWith('Test info message');
      expect(customLogger.error).toHaveBeenCalledWith('Test error message');
      expect(customLogger.warn).toHaveBeenCalledWith('Test warn message');
      expect(customLogger.debug).toHaveBeenCalledWith('Test debug message');
      expect(customLogger.success).toHaveBeenCalledWith('Test success message');
    });

    it('should call progress callback with correct parameters', () => {
      const mockCallback = vi.fn();
      const progressContext: ProgressContext = {
        stage: 'test-stage',
        onProgress: mockCallback,
      };

      log.progress('Test progress', 50, progressContext);

      expect(mockCallback).toHaveBeenCalledWith('test-stage', 50, 'Test progress');
    });
  });

  describe('Default Logger Behavior', () => {
    it('should use console methods by default', () => {
      log.info('Test info');
      log.error('Test error');
      log.warn('Test warn');
      log.success('Test success');

      expect(consoleSpy.log).toHaveBeenCalledWith('Test info');
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ Test error');
      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️  Test warn');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ Test success');
    });

    it('should show debug messages in development mode', () => {
      process.env.NODE_ENV = 'development';

      log.debug('Debug message');

      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 Debug message');
    });

    it('should hide debug messages in production mode', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DEBUG;

      log.debug('Debug message');

      expect(consoleSpy.log).not.toHaveBeenCalledWith('🔍 Debug message');
    });

    it('should show debug messages with DEBUG env', () => {
      process.env.DEBUG = 'true';

      log.debug('Debug message');

      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 Debug message');
    });
  });

  describe('Progress Context Integration', () => {
    it('should handle progress without context', () => {
      log.progress('Simple progress');

      expect(consoleSpy.log).toHaveBeenCalledWith('Simple progress');
    });

    it('should handle progress with number but no context', () => {
      log.progress('Progress with number', 75);

      expect(consoleSpy.log).toHaveBeenCalledWith('Progress with number');
    });

    it('should handle progress with full context', () => {
      const mockCallback = vi.fn();
      const context: ProgressContext = {
        stage: 'build',
        onProgress: mockCallback,
      };

      log.progress('Building...', 30, context);

      expect(consoleSpy.log).toHaveBeenCalledWith('Building...');
      expect(mockCallback).toHaveBeenCalledWith('build', 30, 'Building...');
    });
  });

  describe('Logger Manager Edge Cases', () => {
    it('should handle multiple logger switches correctly', () => {
      const logger1: Logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), success: vi.fn(), progress: vi.fn() };
      const logger2: Logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), success: vi.fn(), progress: vi.fn() };

      loggerManager.register('logger1', logger1);
      loggerManager.register('logger2', logger2);

      loggerManager.switch('logger1');
      log.info('Message to logger1');

      loggerManager.switch('logger2');
      log.info('Message to logger2');

      expect(logger1.info).toHaveBeenCalledWith('Message to logger1');
      expect(logger2.info).toHaveBeenCalledWith('Message to logger2');
      expect(loggerManager.getCurrent()).toBe('logger2');
    });

    it('should maintain logger state across switches', () => {
      const customLogger: Logger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        success: vi.fn(),
        progress: vi.fn(),
      };

      loggerManager.register('persistent', customLogger);
      loggerManager.switch('persistent');

      expect(loggerManager.getCurrent()).toBe('persistent');

      // Switch to default and back
      loggerManager.switch('default');
      expect(loggerManager.getCurrent()).toBe('default');

      loggerManager.switch('persistent');
      expect(loggerManager.getCurrent()).toBe('persistent');
    });
  });

  describe('useCustom Method', () => {
    it('should return undefined when no customLogger is provided', () => {
      const result = loggerManager.useCustom(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined when customLogger is undefined', () => {
      const result = loggerManager.useCustom();
      expect(result).toBeUndefined();
    });

    it('should register and switch to custom logger with auto-generated key', () => {
      const customInfo = vi.fn();
      const customError = vi.fn();

      const usedKey = loggerManager.useCustom({ info: customInfo, error: customError });

      expect(usedKey).toBeDefined();
      expect(usedKey).toMatch(/^custom-\d+$/);
      expect(loggerManager.getCurrent()).toBe(usedKey);
      expect(loggerManager.has(usedKey!)).toBe(true);

      // Verify the custom logger is used
      log.info('test info');
      log.error('test error');

      expect(customInfo).toHaveBeenCalledWith('test info');
      expect(customError).toHaveBeenCalledWith('test error');
    });

    it('should register and switch to custom logger with specified key', () => {
      const customWarn = vi.fn();

      const usedKey = loggerManager.useCustom({ warn: customWarn }, 'my-custom-logger');

      expect(usedKey).toBe('my-custom-logger');
      expect(loggerManager.getCurrent()).toBe('my-custom-logger');
      expect(loggerManager.has('my-custom-logger')).toBe(true);

      log.warn('test warning');
      expect(customWarn).toHaveBeenCalledWith('test warning');
    });

    it('should fallback to default logger methods for unspecified methods', () => {
      const customInfo = vi.fn();

      const usedKey = loggerManager.useCustom({ info: customInfo }, 'partial-logger');
      expect(usedKey).toBe('partial-logger');

      // Custom method should be used
      log.info('custom info');
      expect(customInfo).toHaveBeenCalledWith('custom info');

      // Default methods should still work (fallback to base logger)
      log.error('fallback error');
      log.warn('fallback warn');
      log.success('fallback success');

      // These should use default console methods
      expect(consoleSpy.error).toHaveBeenCalledWith('❌ fallback error');
      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️  fallback warn');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ fallback success');
    });

    it('should allow restoring to default after useCustom', () => {
      const customInfo = vi.fn();

      const usedKey = loggerManager.useCustom({ info: customInfo }, 'temp-logger');
      expect(loggerManager.getCurrent()).toBe('temp-logger');

      log.info('to custom');
      expect(customInfo).toHaveBeenCalledWith('to custom');

      // Restore to default
      loggerManager.switch('default');
      expect(loggerManager.getCurrent()).toBe('default');

      // Should now use default logger
      log.info('to default');
      expect(consoleSpy.log).toHaveBeenCalledWith('to default');
    });

    it('should support typical builder/packer/uploader pattern', () => {
      const pluginLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        success: vi.fn(),
        progress: vi.fn(),
      };

      // Simulate builder pattern
      const prevKey = loggerManager.getCurrent();
      const usedKey = loggerManager.useCustom(pluginLogger, 'plugin-logger');

      try {
        // Simulate build operations
        log.info('Building...');
        log.success('Build complete');
        log.progress('Progress', 50);

        expect(pluginLogger.info).toHaveBeenCalledWith('Building...');
        expect(pluginLogger.success).toHaveBeenCalledWith('Build complete');
        expect(pluginLogger.progress).toHaveBeenCalledWith('Progress', 50, undefined);
      } finally {
        // Restore previous logger
        if (usedKey) {
          loggerManager.switch(prevKey);
        }
      }

      expect(loggerManager.getCurrent()).toBe(prevKey);
    });

    it('should handle progress with context in custom logger', () => {
      const mockOnProgress = vi.fn();
      const customProgress = vi.fn((msg, progress, context) => {
        if (context?.onProgress && typeof progress === 'number') {
          context.onProgress(context.stage, progress, msg);
        }
      });

      loggerManager.useCustom({ progress: customProgress }, 'progress-logger');

      const context: ProgressContext = {
        stage: 'upload',
        onProgress: mockOnProgress,
      };

      log.progress('Uploading...', 75, context);

      expect(customProgress).toHaveBeenCalledWith('Uploading...', 75, context);
      expect(mockOnProgress).toHaveBeenCalledWith('upload', 75, 'Uploading...');
    });
  });
});