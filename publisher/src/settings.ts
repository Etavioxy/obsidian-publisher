/**
 * Settings management module
 */

import { PublisherSettings, PublishHistoryEntry, PublishProfile } from './types';

/**
 * Generate a unique profile ID
 */
export function generateProfileId(): string {
	return `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new default profile
 */
export function createDefaultProfile(name: string = 'Default', siteName: string = ''): PublishProfile {
	return {
		id: generateProfileId(),
		name,
		siteName: siteName || name.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
		sourceDir: '.',
		enabled: true,
		description: '',
	};
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: PublisherSettings = {
	// Server configuration
	serverUrl: 'http://localhost:8080',
	authToken: '',
	
	// Build configuration
	vaultPath: '',  // Will be set to vault path on load
	basePath: '',  // Will be set to vault path on load
	outputDir: './dist',
	srcDir: '.',
	excludePatterns: [
		'.obsidian/**',
		'.trash/**',
		'node_modules/**',
		'.git/**'
	],
	
	// Publish profiles
	profiles: [],
	activeProfileId: null,
	
	// Advanced options
	keepTempFiles: false,
	autoPublishOnSave: false,
	
	// UI preferences
	showStatusBar: true,
	showNotifications: true,
};

/**
 * Settings validation
 */
export class SettingsValidator {
	/**
	 * Validate server URL
	 */
	static validateServerUrl(url: string): { valid: boolean; message?: string } {
		if (!url) {
			return { valid: false, message: 'Server URL is required' };
		}
		
		try {
			const parsedUrl = new URL(url);
			if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
				return { valid: false, message: 'Server URL must use HTTP or HTTPS protocol' };
			}
			return { valid: true };
		} catch (e) {
			return { valid: false, message: 'Invalid URL format' };
		}
	}
	
	/**
	 * Validate auth token
	 */
	static validateAuthToken(token: string): { valid: boolean; message?: string } {
		if (!token || token.trim().length === 0) {
			return { valid: false, message: 'Authentication token is required' };
		}
		return { valid: true };
	}
	
	/**
	 * Validate exclude patterns
	 */
	static validateExcludePatterns(patterns: string[]): { valid: boolean; message?: string } {
		if (!Array.isArray(patterns)) {
			return { valid: false, message: 'Exclude patterns must be an array' };
		}
		
		for (const pattern of patterns) {
			if (typeof pattern !== 'string' || pattern.trim().length === 0) {
				return { valid: false, message: 'Each exclude pattern must be a non-empty string' };
			}
		}
		
		return { valid: true };
	}
	
	/**
	 * Validate all settings
	 */
	static validateSettings(settings: PublisherSettings): { valid: boolean; errors: string[] } {
		const errors: string[] = [];
		
		const urlValidation = this.validateServerUrl(settings.serverUrl);
		if (!urlValidation.valid) {
			errors.push(urlValidation.message!);
		}
		
		const patternsValidation = this.validateExcludePatterns(settings.excludePatterns);
		if (!patternsValidation.valid) {
			errors.push(patternsValidation.message!);
		}
		
		return {
			valid: errors.length === 0,
			errors
		};
	}
}

/**
 * Publish history manager
 */
export class PublishHistory {
	private static readonly MAX_HISTORY_SIZE = 50;
	private history: PublishHistoryEntry[] = [];
	
	/**
	 * Add entry to history
	 */
	addEntry(entry: PublishHistoryEntry): void {
		this.history.unshift(entry);
		
		// Keep only the most recent entries
		if (this.history.length > PublishHistory.MAX_HISTORY_SIZE) {
			this.history = this.history.slice(0, PublishHistory.MAX_HISTORY_SIZE);
		}
	}
	
	/**
	 * Get all history entries
	 */
	getHistory(): PublishHistoryEntry[] {
		return [...this.history];
	}
	
	/**
	 * Get recent entries
	 */
	getRecentEntries(count: number = 10): PublishHistoryEntry[] {
		return this.history.slice(0, count);
	}
	
	/**
	 * Clear history
	 */
	clearHistory(): void {
		this.history = [];
	}
	
	/**
	 * Load history from data
	 */
	loadFromData(data: PublishHistoryEntry[]): void {
		if (Array.isArray(data)) {
			this.history = data;
		}
	}
	
	/**
	 * Export history to data
	 */
	exportToData(): PublishHistoryEntry[] {
		return this.history;
	}
}
