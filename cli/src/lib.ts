/**
 * Obsidian Publisher Library
 * 
 * Pure ESM library for publishing Obsidian vaults.
 * This module provides programmatic access to all publishing functions
 * without CLI dependencies (no commander).
 */

// Re-export core modules
export { buildSite } from './builder';
export type { BuildOptions } from './builder';

export { createArchive } from './packer';
export type { ArchiveOptions } from './packer';

export { uploadArchive } from './uploader';
export type { UploadOptions, UploadResult } from './uploader';

export { analyzeSiteStructure } from './site-structure';
export type { SiteStructure } from './site-structure';

export { generateIndexPage } from './index-page';

// Re-export logger
export { log, createLogger, loggerManager } from './utils/logger';
export type { Logger, LogLevel, ProgressContext } from './utils/logger';