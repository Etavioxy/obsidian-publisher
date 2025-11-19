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

import { buildSite } from './builder';
import { createArchive } from './packer';
import { uploadArchive } from './uploader';
import { analyzeSiteStructure } from './site-structure';
import { generateIndexPage } from './index-page';

/**
 * Default export with all functions
 */
export default {
  buildSite,
  createArchive,
  uploadArchive,
  analyzeSiteStructure,
  generateIndexPage
};
