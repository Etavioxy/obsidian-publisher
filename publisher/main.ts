/**
 * Obsidian Publisher Plugin
 * Publish your Obsidian vault to a static site or server
 */

import { App, Plugin, Notice, TFile } from 'obsidian';
import { PublisherSettings, PublishHistoryEntry, UploadResult, PublishProfile } from './src/types';
import { DEFAULT_SETTINGS, SettingsValidator, PublishHistory } from './src/settings';
import { CommandExecutor } from './src/commands';
import { StatusBarManager } from './src/ui/StatusBar';
import { PublishModal, BuildModal } from './src/ui/PublishModal';
import { PublisherSettingTab } from './src/ui/SettingTab';
import path from 'path';

/**
 * Main plugin class
 */
export default class ObsidianPublisherPlugin extends Plugin {
	settings: PublisherSettings;
	publishHistory: PublishHistory;
	statusBarManager: StatusBarManager | null = null;
	
	private autoSaveTimeout: number | null = null;

	async onload() {
		// Load settings and history
		await this.loadSettings();
		
		// Set vault path if not configured
		if (!this.settings.vaultPath) {
			this.settings.vaultPath = (this.app.vault.adapter as any).basePath || '.';
			await this.saveSettings();
		}
		
		// Initialize status bar
		if (this.settings.showStatusBar) {
			this.initStatusBar();
		}
		
		// Register commands
		this.registerCommands();
		
		// Add ribbon icon
		this.addRibbonIcon('upload-cloud', 'Publish Site', () => {
			this.openPublishModal();
		});
		
		// Add settings tab
		this.addSettingTab(new PublisherSettingTab(this.app, this));
		
		// Register file save event for auto-publish
		if (this.settings.autoPublishOnSave) {
			this.registerAutoPublish();
		}
	}

	onunload() {
		// Clean up status bar
		if (this.statusBarManager) {
			this.statusBarManager.destroy();
		}
		
		// Clear any pending auto-save
		if (this.autoSaveTimeout) {
			window.clearTimeout(this.autoSaveTimeout);
		}
	}

	/**
	 * Load plugin settings
	 */
	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings || {});
		
		// Load publish history
		this.publishHistory = new PublishHistory();
		if (data?.history) {
			this.publishHistory.loadFromData(data.history);
		}
	}

	/**
	 * Save plugin settings
	 */
	async saveSettings() {
		await this.saveData({
			settings: this.settings,
			history: this.publishHistory.exportToData()
		});
	}
	
	/**
	 * Initialize status bar
	 */
	private initStatusBar(): void {
		const statusBarItem = this.addStatusBarItem();
		this.statusBarManager = new StatusBarManager(statusBarItem);
		
		// Add click handler
		this.statusBarManager.onClick(() => {
			this.openPublishModal();
		});
	}
	
	/**
	 * Update status bar visibility
	 */
	updateStatusBarVisibility(): void {
		if (this.settings.showStatusBar && !this.statusBarManager) {
			this.initStatusBar();
		} else if (!this.settings.showStatusBar && this.statusBarManager) {
			this.statusBarManager.destroy();
			this.statusBarManager = null;
		}
	}
	
	/**
	 * Register plugin commands
	 */
	private registerCommands(): void {
		// Publish command
		this.addCommand({
			id: 'publish-site',
			name: 'Publish Site',
			callback: () => {
				this.openPublishModal();
			}
		});
		
		// Build only command
		this.addCommand({
			id: 'build-site',
			name: 'Build Site (without uploading)',
			callback: () => {
				new BuildModal(this.app, this.settings).open();
			}
		});
		
		// Quick publish command (no UI)
		this.addCommand({
			id: 'quick-publish',
			name: 'Quick Publish (background)',
			callback: async () => {
				await this.quickPublish();
			}
		});
		
		// Open settings command
		this.addCommand({
			id: 'open-settings',
			name: 'Open Publisher Settings',
			callback: () => {
				// @ts-ignore - accessing private API
				this.app.setting.open();
				// @ts-ignore - accessing private API
				this.app.setting.openTabById(this.manifest.id);
			}
		});
	}
	
	/**
	 * Open publish modal
	 */
	private openPublishModal(): void {
		// Validate settings before opening modal
		const validation = SettingsValidator.validateSettings(this.settings);
		if (!validation.valid) {
			new Notice(`Please configure settings first:\n${validation.errors.join('\n')}`, 10000);
			return;
		}
		
		const activeProfile = this.getActiveProfile();
		
		new PublishModal(
			this.app, 
			this.settings, 
			activeProfile, 
			(result, profile) => {
				this.onPublishComplete(result, profile);
			},
			async (profileId) => {
				// Update active profile when changed in modal
				this.settings.activeProfileId = profileId;
				await this.saveSettings();
			}
		).open();
	}
	
	/**
	 * Quick publish without UI
	 */
	private async quickPublish(): Promise<void> {
		if (!this.settings.authToken) {
			new Notice('Please configure authentication token in settings');
			return;
		}
		
		// Get active profile
		const activeProfile = this.getActiveProfile();
		if (!activeProfile) {
			new Notice('Please create and select a publish profile in settings');
			return;
		}
		
		// Update status bar
		this.statusBarManager?.setStatus('building', `Publishing ${activeProfile.name}...`);
		
		new Notice(`Starting publish for "${activeProfile.name}"...`);
		
		const vaultBasePath = (this.app.vault.adapter as any).basePath || '.';
		// Determine source path based on profile's sourceDir
		const sourcePath = activeProfile.sourceDir === '.' 
			? vaultBasePath 
			: path.join(vaultBasePath, activeProfile.sourceDir);
		
		const result = await CommandExecutor.publish({
			vaultPath: sourcePath,
			serverUrl: this.settings.serverUrl,
			token: this.settings.authToken,
			siteName: activeProfile.siteName,
			excludePatterns: this.settings.excludePatterns,
			keepTemp: this.settings.keepTempFiles,
			basePath: this.settings.basePath || vaultBasePath
		}, {
			onProgress: (stage, progress) => {
				this.statusBarManager?.showProgress(stage, progress);
			}
		});
		
		if (result.success) {
			this.statusBarManager?.setStatus('success', 'Published!');
			new Notice(`✅ Published "${activeProfile.name}" successfully!\nURL: http://${result.data.url}`, 10000);
			this.onPublishComplete(result.data, activeProfile);
			
			// Reset status after a delay
			setTimeout(() => {
				this.statusBarManager?.setStatus('idle');
			}, 5000);
		} else {
			this.statusBarManager?.setStatus('error', 'Failed');
			new Notice(`❌ Publish failed: ${result.message}`, 10000);
			
			// Reset status after a delay
			setTimeout(() => {
				this.statusBarManager?.setStatus('idle');
			}, 5000);
		}
	}
	
	/**
	 * Get the active publish profile
	 */
	getActiveProfile(): PublishProfile | null {
		if (!this.settings.activeProfileId) {
			return null;
		}
		return this.settings.profiles.find(p => p.id === this.settings.activeProfileId && p.enabled) || null;
	}
	
	/**
	 * Handle publish completion
	 */
	private onPublishComplete(result: UploadResult, profile?: PublishProfile): void {
		// Add to history
		const historyEntry: PublishHistoryEntry = {
			timestamp: Date.now(),
			siteUrl: result.url,
			siteId: result.id,
			success: true
		};
		
		this.publishHistory.addEntry(historyEntry);
		
		// Update profile's last published info
		if (profile) {
			const profileIndex = this.settings.profiles.findIndex(p => p.id === profile.id);
			if (profileIndex !== -1) {
				this.settings.profiles[profileIndex].lastPublished = Date.now();
				this.settings.profiles[profileIndex].lastPublishUrl = result.url;
			}
		}
		
		this.saveSettings();
	}
	
	/**
	 * Register auto-publish on file save
	 */
	private registerAutoPublish(): void {
		this.registerEvent(
			this.app.vault.on('modify', (file: TFile) => {
				// Debounce auto-publish
				if (this.autoSaveTimeout) {
					window.clearTimeout(this.autoSaveTimeout);
				}
				
				this.autoSaveTimeout = window.setTimeout(() => {
					this.quickPublish();
				}, 5000); // Wait 5 seconds after last modification
			})
		);
	}
}
