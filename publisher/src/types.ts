/**
 * Type definitions for Obsidian Publisher plugin
 */

/**
 * Publish profile - a saved configuration for publishing a specific site
 */
export interface PublishProfile {
	/** Unique identifier for this profile */
	id: string;
	/** Display name for this profile */
	name: string;
	/** Site name used for URL path (must be unique per user on server) */
	siteName: string;
	/** Path to source directory within vault (relative to vault root) */
	sourceDir: string;
	/** Whether this profile is visible/enabled */
	enabled: boolean;
	/** Optional description */
	description?: string;
	/** Optional custom server URL (uses default if not set) */
	serverUrl?: string;
	/** Last successful publish timestamp */
	lastPublished?: number;
	/** Last publish result URL */
	lastPublishUrl?: string;
}

/**
 * Plugin settings interface
 */
export interface PublisherSettings {
	// Server configuration
	serverUrl: string;
	/** Map of server URLs to their authentication tokens */
	serverTokens: Record<string, string>;
	
	// Build configuration
	vaultPath: string;
	basePath: string;
	outputDir: string;
	srcDir: string;
	excludePatterns: string[];
	
	// Publish profiles
	profiles: PublishProfile[];
	activeProfileId: string | null;
	
	// Advanced options
	keepTempFiles: boolean;
	autoPublishOnSave: boolean;
	
	// UI preferences
	showStatusBar: boolean;
	showNotifications: boolean;
}

/**
 * Build command options
 */
export interface BuildOptions {
	vaultPath: string;
	outputDir: string;
	srcDir?: string;
	excludePatterns?: string[];
	onlyTemp?: boolean;
	optionTempDir?: string;
	/** Base path used to resolve relative paths (plugin directory or other) */
	basePath: string;
}

/**
 * Pack command options
 */
export interface PackOptions {
	buildDir: string;
	outputPath?: string;
	format?: 'tar' | 'zip';
}

/**
 * Upload command options
 */
export interface UploadOptions {
	archivePath: string;
	serverUrl: string;
	token: string;
	/** Site name for the published site */
	siteName: string;
	metaPath?: string;
}

/**
 * Publish command options (combines build, pack, upload)
 */
export interface PublishOptions {
	vaultPath: string;
	serverUrl: string;
	token: string;
	/** Site name for the published site (used in URL path) */
	siteName: string;
	excludePatterns?: string[];
	keepTemp?: boolean;
	/** Optional base path for resolving relative output/temp paths */
	basePath: string;
}

/**
 * Command execution result
 */
export interface CommandResult {
	success: boolean;
	message: string;
	data?: any;
	error?: Error;
}

/**
 * Upload result from server
 */
export interface UploadResult {
	id: string;
	url: string;
	name?: string;
	domain?: string | null;
	description?: string;
	created_at?: string;
	siteId?: string;
	timestamp?: number;
}

/**
 * Progress callback for long-running operations
 */
export type ProgressCallback = (stage: string, progress: number, message?: string) => void;

/**
 * Command execution context
 */
export interface CommandContext {
	onProgress?: ProgressCallback;
	onLog?: (message: string) => void;
	onError?: (error: Error) => void;
}

/**
 * Site metadata
 */
export interface SiteMeta {
	version: string;
	siteId: string;
	buildTime?: number;
	vaultName?: string;
}

/**
 * Publish history entry
 */
export interface PublishHistoryEntry {
	timestamp: number;
	siteUrl: string;
	siteId: string;
	success: boolean;
	message?: string;
}
