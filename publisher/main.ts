/**
 * Obsidian Publisher Plugin
 * Publish your Obsidian vault to a static site or server
 */

import { App, Plugin, Notice, TFile } from 'obsidian';
import { PublisherSettings, PublishHistoryEntry, UploadResult } from './src/types';
import { DEFAULT_SETTINGS, SettingsValidator, PublishHistory } from './src/settings';
import { CommandExecutor } from './src/commands';
import { StatusBarManager } from './src/ui/StatusBar';
import { PublishModal, BuildModal } from './src/ui/PublishModal';
import { PublisherSettingTab } from './src/ui/SettingTab';

/**
 * Main plugin class
 */
export default class ObsidianPublisherPlugin extends Plugin {
	settings: PublisherSettings;
	publishHistory: PublishHistory;
	statusBarManager: StatusBarManager | null = null;
	
	private autoSaveTimeout: number | null = null;

	async onload() {
		console.log('Loading Obsidian Publisher plugin');
		
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
		
		console.log('Obsidian Publisher plugin loaded');
	}

	onunload() {
		console.log('Unloading Obsidian Publisher plugin');
		
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
		
		new PublishModal(this.app, this.settings, (result) => {
			this.onPublishComplete(result);
		}).open();
	}
	
	/**
	 * Quick publish without UI
	 */
	private async quickPublish(): Promise<void> {
		if (!this.settings.authToken) {
			new Notice('Please configure authentication token in settings');
			return;
		}
		
		// Update status bar
		this.statusBarManager?.setStatus('building', 'Publishing...');
		
		new Notice('Starting publish...');
		
		const vaultPath = this.settings.vaultPath || (this.app.vault.adapter as any).basePath || '.';
		const basePath = (this.app.vault.adapter as any).basePath;
		const result = await CommandExecutor.publish({
			vaultPath: vaultPath,
			serverUrl: this.settings.serverUrl,
			token: this.settings.authToken,
			excludePatterns: this.settings.excludePatterns,
			keepTemp: this.settings.keepTempFiles,
			basePath: basePath
		}, {
			onProgress: (stage, progress) => {
				this.statusBarManager?.showProgress(stage, progress);
			}
		});
		
		if (result.success) {
			this.statusBarManager?.setStatus('success', 'Published!');
			new Notice(`✅ Published successfully! URL: http://${result.data.url}`, 10000);
			this.onPublishComplete(result.data);
			
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
	 * Handle publish completion
	 */
	private onPublishComplete(result: UploadResult): void {
		// Add to history
		const historyEntry: PublishHistoryEntry = {
			timestamp: Date.now(),
			siteUrl: result.url,
			siteId: result.id,
			success: true
		};
		
		this.publishHistory.addEntry(historyEntry);
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
