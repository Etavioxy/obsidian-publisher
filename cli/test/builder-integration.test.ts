/**
 * Builder integration tests for logger functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { buildSite, BuildOptions } from '../src/builder.js';
import { loggerManager, Logger } from '../src/utils/logger.js';
import fs from 'fs-extra';
import * as path from 'path';

// Mock fs operations
vi.mock('../src/utils/fs', () => ({
  default: {
    pathExists: vi.fn(),
    ensureDir: vi.fn(),
    readdir: vi.fn(),
    copy: vi.fn(),
    remove: vi.fn(),
    writeFile: vi.fn(),
  }
}));

// Mock other dependencies
vi.mock('../src/site-structure', () => ({
  analyzeSiteStructure: vi.fn().mockResolvedValue({
    nav: [],
    wikiLinkMap: {},
    sidebar: {}
  })
}));

vi.mock('../src/index-page', () => ({
  generateIndexPage: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('child_process', () => ({
  exec: vi.fn((cmd, options, callback) => {
    // Simulate successful execution
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    callback(null, 'success', '');
  })
}));

vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([])
}));

describe('Builder Logger Integration', () => {
  let mockFS: any;

  beforeEach(async () => {
    const { default: fsModule } = await import('../src/utils/fs');
    mockFS = fsModule;

    vi.clearAllMocks();

    // Reset logger to default
    loggerManager.switch('default');

    // Setup basic fs mocks
    mockFS.pathExists.mockResolvedValue(false);
    mockFS.readdir.mockResolvedValue([]);
    mockFS.ensureDir.mockResolvedValue();
    mockFS.copy.mockResolvedValue();
    mockFS.remove.mockResolvedValue();
    mockFS.writeFile.mockResolvedValue();
  });

  it('should use default logger when no custom logger provided', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const buildOptions: BuildOptions = {
      outputDir: './test-output',
      basePath: process.cwd(),
      onlyTemp: true // Skip VitePress build for testing
    };

    try {
      await buildSite('./test-vault', buildOptions);
    } catch (error) {
      // Expected to fail due to mocking, but we're testing logger behavior
    }

    // Should still be using default logger
    expect(loggerManager.getCurrent()).toBe('default');

    consoleSpy.mockRestore();
  });

  it('should switch to custom logger when provided', async () => {
    const customLogger: Logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      success: vi.fn(),
      progress: vi.fn(),
    };

    const buildOptions: BuildOptions = {
      outputDir: './test-output',
      basePath: process.cwd(),
      onlyTemp: true,
      customLogger,
      customLoggerKey: 'test-logger'
    };

    try {
      await buildSite('./test-vault', buildOptions);
    } catch (error) {
      // Expected to fail due to mocking
    }

    // Custom logger should have received log calls during build
    expect(customLogger.info).toHaveBeenCalled();

    // Should restore default logger after completion
    expect(loggerManager.getCurrent()).toBe('default');
  });

  it('should generate logger key if not provided', async () => {
    const customLogger: Logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      success: vi.fn(),
      progress: vi.fn(),
    };

    const buildOptions: BuildOptions = {
      outputDir: './test-output',
      basePath: process.cwd(),
      onlyTemp: true,
      customLogger
      // No customLoggerKey provided
    };

    try {
      await buildSite('./test-vault', buildOptions);
    } catch (error) {
      // Expected to fail due to mocking
    }

    // Custom logger should have received log calls during build
    expect(customLogger.info).toHaveBeenCalled();

    // Should restore default logger
    expect(loggerManager.getCurrent()).toBe('default');
  });

  it('should restore original logger even when build fails', async () => {
    // Start with a non-default logger
    loggerManager.createCustom('initial', {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      success: vi.fn(),
      progress: vi.fn(),
    });
    loggerManager.switch('initial');

    expect(loggerManager.getCurrent()).toBe('initial');

    const buildOptions: BuildOptions = {
      outputDir: './test-output',
      basePath: process.cwd(),
    };

    // Mock to cause an error
    mockFS.readdir.mockRejectedValue(new Error('Directory not empty'));

    try {
      await buildSite('./test-vault', buildOptions);
    } catch (error) {
      // Expected to fail
    }

    // Should restore to the initial logger, not default
    expect(loggerManager.getCurrent()).toBe('initial');
  });

  it('should redirect all log calls to custom logger during build', async () => {
    const customLogger: Logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      success: vi.fn(),
      progress: vi.fn(),
    };

    const buildOptions: BuildOptions = {
      outputDir: './test-output',
      basePath: process.cwd(),
      onlyTemp: true,
      customLogger,
      customLoggerKey: 'redirect-test'
    };

    try {
      await buildSite('./test-vault', buildOptions);
    } catch (error) {
      // Expected to fail due to mocking
    }

    // Verify that multiple log methods were called on custom logger
    expect(customLogger.progress).toHaveBeenCalled();
    expect(customLogger.info).toHaveBeenCalled();
  });

  it('should handle logger restoration correctly when no switch occurred', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const buildOptions: BuildOptions = {
      outputDir: './test-output',
      basePath: process.cwd(),
      onlyTemp: true
    };

    try {
      await buildSite('./test-vault', buildOptions);
    } catch (error) {
      // Expected to fail due to mocking
    }

    // Should not try to restore if no switch occurred
    expect(loggerManager.getCurrent()).toBe('default');

    // Should not log restoration message
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/🔧 Restored original logger/)
    );

    consoleSpy.mockRestore();
  });
});