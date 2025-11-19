/**
 * Settings tab for Obsidian Publisher
 */

import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type ObsidianPublisherPlugin from '../../main';
import { SettingsValidator } from '../settings';

/**
 * Settings tab UI
 */
export class PublisherSettingTab extends PluginSettingTab {
	plugin: ObsidianPublisherPlugin;
	
	constructor(app: App, plugin: ObsidianPublisherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		
		containerEl.createEl('h1', { text: 'Obsidian Publisher Settings' });
		
		// ===== Server Configuration =====
		containerEl.createEl('h2', { text: 'Server Configuration' });
		
		new Setting(containerEl)
			.setName('Server URL')
			.setDesc('The URL of your publishing server')
			.addText(text => text
				.setPlaceholder('http://localhost:8080')
				.setValue(this.plugin.settings.serverUrl)
				.onChange(async (value) => {
					this.plugin.settings.serverUrl = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Authentication Token')
			.setDesc('Your authentication token for the publishing server')
			.addText(text => {
				text
					.setPlaceholder('Enter your token')
					.setValue(this.plugin.settings.authToken)
					.onChange(async (value) => {
						this.plugin.settings.authToken = value;
						await this.plugin.saveSettings();
					});
				//text.inputEl.type = 'password';
				return text;
			});
		
		new Setting(containerEl)
			.setName('Test Connection')
			.setDesc('Test the connection to the publishing server')
			.addButton(button => button
				.setButtonText('Test')
				.onClick(async () => {
					await this.testConnection();
				}));
		
		// ===== Build Configuration =====
		containerEl.createEl('h2', { text: 'Build Configuration' });
		
		new Setting(containerEl)
			.setName('Vault Path')
			.setDesc('Path to your Obsidian vault (leave empty to use current vault)')
			.addText(text => text
				.setPlaceholder('Leave empty for current vault')
				.setValue(this.plugin.settings.vaultPath)
				.onChange(async (value) => {
					this.plugin.settings.vaultPath = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Base Work Path')
			.setDesc('Please set as path to your plugin')
			.addText(text => text
				.setValue(this.plugin.settings.basePath)
				.onChange(async (value) => {
					this.plugin.settings.basePath = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Output Directory')
			.setDesc('Directory where the built site will be stored')
			.addText(text => text
				.setPlaceholder('./dist')
				.setValue(this.plugin.settings.outputDir)
				.onChange(async (value) => {
					this.plugin.settings.outputDir = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Source Directory')
			.setDesc('VitePress source directory within the build')
			.addText(text => text
				.setPlaceholder('.')
				.setValue(this.plugin.settings.srcDir)
				.onChange(async (value) => {
					this.plugin.settings.srcDir = value;
					await this.plugin.saveSettings();
				}));
		
		// Exclude patterns
		containerEl.createEl('h3', { text: 'Exclude Patterns' });
		containerEl.createEl('p', { 
			text: 'Files and folders matching these patterns will be excluded from publishing',
			cls: 'setting-item-description'
		});
		
		// Display current patterns
		const patternsContainer = containerEl.createDiv({ cls: 'obs-publisher-patterns' });
		this.renderExcludePatterns(patternsContainer);
		
		// Add new pattern
		new Setting(containerEl)
			.setName('Add Exclude Pattern')
			.setDesc('Add a new pattern to exclude (e.g., .obsidian/**, *.tmp)')
			.addText(text => text
				.setPlaceholder('e.g., .trash/**')
				.then(textComponent => {
					textComponent.inputEl.id = 'new-pattern-input';
				}))
			.addButton(button => button
				.setButtonText('Add')
				.setCta()
				.onClick(async () => {
					const input = (containerEl.querySelector('#new-pattern-input') as HTMLInputElement);
					const pattern = input.value.trim();
					
					if (pattern) {
						if (!this.plugin.settings.excludePatterns.includes(pattern)) {
							this.plugin.settings.excludePatterns.push(pattern);
							await this.plugin.saveSettings();
							input.value = '';
							this.renderExcludePatterns(patternsContainer);
							new Notice('Pattern added');
						} else {
							new Notice('Pattern already exists');
						}
					}
				}));
		
		// ===== Advanced Options =====
		containerEl.createEl('h2', { text: 'Advanced Options' });
		
		new Setting(containerEl)
			.setName('Keep Temporary Files')
			.setDesc('Keep temporary build files for debugging')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.keepTempFiles)
				.onChange(async (value) => {
					this.plugin.settings.keepTempFiles = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('Auto-publish on Save')
			.setDesc('Automatically publish when you save files (experimental)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoPublishOnSave)
				.onChange(async (value) => {
					this.plugin.settings.autoPublishOnSave = value;
					await this.plugin.saveSettings();
					new Notice(
						value ? 'Auto-publish enabled' : 'Auto-publish disabled'
					);
				}));
		
		// ===== UI Preferences =====
		containerEl.createEl('h2', { text: 'UI Preferences' });
		
		new Setting(containerEl)
			.setName('Show Status Bar')
			.setDesc('Show publishing status in the status bar')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showStatusBar)
				.onChange(async (value) => {
					this.plugin.settings.showStatusBar = value;
					await this.plugin.saveSettings();
					this.plugin.updateStatusBarVisibility();
				}));
		
		new Setting(containerEl)
			.setName('Show Notifications')
			.setDesc('Show notifications for publish operations')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showNotifications)
				.onChange(async (value) => {
					this.plugin.settings.showNotifications = value;
					await this.plugin.saveSettings();
				}));
		
		// ===== Publishing History =====
		containerEl.createEl('h2', { text: 'Publishing History' });
		
		const historyContainer = containerEl.createDiv({ cls: 'obs-publisher-history' });
		this.renderPublishHistory(historyContainer);
		
		new Setting(containerEl)
			.setName('Clear History')
			.setDesc('Clear all publishing history')
			.addButton(button => button
				.setButtonText('Clear')
				.setWarning()
				.onClick(async () => {
					this.plugin.publishHistory.clearHistory();
					await this.plugin.saveSettings();
					this.renderPublishHistory(historyContainer);
					new Notice('History cleared');
				}));
		
		// ===== Validation =====
		containerEl.createEl('h2', { text: 'Validation' });
		
		new Setting(containerEl)
			.setName('Validate Settings')
			.setDesc('Check if all settings are correctly configured')
			.addButton(button => button
				.setButtonText('Validate')
				.onClick(() => {
					this.validateSettings();
				}));
	}
	
	/**
	 * Render exclude patterns list
	 */
	private renderExcludePatterns(container: HTMLElement): void {
		container.empty();
		
		if (this.plugin.settings.excludePatterns.length === 0) {
			container.createEl('p', { 
				text: 'No exclude patterns configured',
				cls: 'obs-publisher-empty-list'
			});
			return;
		}
		
		const list = container.createEl('ul', { cls: 'obs-publisher-pattern-list' });
		
		for (const pattern of this.plugin.settings.excludePatterns) {
			const item = list.createEl('li', { cls: 'obs-publisher-pattern-item' });
			item.createSpan({ text: pattern, cls: 'obs-publisher-pattern-text' });
			
			const removeBtn = item.createEl('button', { 
				text: '×',
				cls: 'obs-publisher-remove-btn'
			});
			removeBtn.onclick = async () => {
				this.plugin.settings.excludePatterns = 
					this.plugin.settings.excludePatterns.filter((p: string) => p !== pattern);
				await this.plugin.saveSettings();
				this.renderExcludePatterns(container);
				new Notice('Pattern removed');
			};
		}
	}
	
	/**
	 * Render publish history
	 */
	private renderPublishHistory(container: HTMLElement): void {
		container.empty();
		
		const recentHistory = this.plugin.publishHistory.getRecentEntries(5);
		
		if (recentHistory.length === 0) {
			container.createEl('p', { 
				text: 'No publishing history',
				cls: 'obs-publisher-empty-list'
			});
			return;
		}
		
		const list = container.createEl('ul', { cls: 'obs-publisher-history-list' });
		
		for (const entry of recentHistory) {
			const item = list.createEl('li', { 
				cls: `obs-publisher-history-item ${entry.success ? 'success' : 'failed'}`
			});
			
			const date = new Date(entry.timestamp).toLocaleString();
			const status = entry.success ? '✅' : '❌';
			
			item.createSpan({ 
				text: `${status} ${date}`,
				cls: 'obs-publisher-history-date'
			});
			
			if (entry.success && entry.siteUrl) {
				const link = item.createEl('a', {
					text: entry.siteUrl,
					cls: 'obs-publisher-history-url',
					href: `http://${entry.siteUrl}`
				});
				link.setAttribute('target', '_blank');
			}
			
			if (entry.message) {
				item.createDiv({ 
					text: entry.message,
					cls: 'obs-publisher-history-message'
				});
			}
		}
	}
	
	/**
	 * Test server connection
	 */
	private async testConnection(): Promise<void> {
		const validation = SettingsValidator.validateServerUrl(this.plugin.settings.serverUrl);
		
		if (!validation.valid) {
			new Notice(`Invalid server URL: ${validation.message}`);
			return;
		}
		
		try {
			new Notice('Testing connection...');
			
			// Simple ping test
			const response = await fetch(`${this.plugin.settings.serverUrl}/auth/me`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${this.plugin.settings.authToken}`
				}
			});
			
			if (response.ok) {
				new Notice('✅ Connection successful!');
			} else {
				new Notice(`❌ Connection failed: ${response.status} ${response.statusText}`);
			}
		} catch (error) {
			new Notice(`❌ Connection failed: ${error}`);
		}
	}
	
	/**
	 * Validate all settings
	 */
	private validateSettings(): void {
		const validation = SettingsValidator.validateSettings(this.plugin.settings);
		
		if (validation.valid) {
			new Notice('✅ All settings are valid!');
		} else {
			const errors = validation.errors.join('\n');
			new Notice(`❌ Settings validation failed:\n${errors}`, 10000);
		}
	}
}
