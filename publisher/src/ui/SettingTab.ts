/**
 * Settings tab for Obsidian Publisher
 */

import { App, PluginSettingTab, Setting, Notice, Modal, TextComponent, FuzzySuggestModal, TFolder, Menu } from 'obsidian';
import type ObsidianPublisherPlugin from '../../main';
import { SettingsValidator, createDefaultProfile } from '../settings';
import type { PublishProfile } from '../types';

/**
 * Folder suggestion modal using Obsidian's fuzzy search
 */
class FolderSuggestModal extends FuzzySuggestModal<TFolder | string> {
	private onChoose: (folder: string) => void;

	constructor(app: App, onChoose: (folder: string) => void) {
		super(app);
		this.onChoose = onChoose;
		this.setPlaceholder('Type to search folders...');
	}

	getItems(): (TFolder | string)[] {
		// Get all folders from vault
		const folders = this.app.vault.getAllFolders(false);
		// Add root option as special string
		return ['.', ...folders];
	}

	getItemText(item: TFolder | string): string {
		if (typeof item === 'string') {
			return '. (Vault Root)';
		}
		return item.path;
	}

	onChooseItem(item: TFolder | string, evt: MouseEvent | KeyboardEvent): void {
		const path = typeof item === 'string' ? item : item.path;
		this.onChoose(path);
	}
}

/**
 * Settings tab UI
 */
export class PublisherSettingTab extends PluginSettingTab {
	plugin: ObsidianPublisherPlugin;
	_clearClickedOnce: boolean = false;
	
	constructor(app: App, plugin: ObsidianPublisherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}
	
	display(): void {
		// Reset click confirmation flag when displaying
		this._clearClickedOnce = false;

		const { containerEl } = this;
		containerEl.empty();
		
		containerEl.createEl('h1', { text: 'Obsidian Publisher Settings' });
		
		// ===== Server Configuration =====
		containerEl.createEl('h2', { text: 'Server Configuration' });
		
		new Setting(containerEl)
			.setName('Default Server URL')
			.setDesc('The default URL of your publishing server (used when profile has no custom server)')
			.addText(text => text
				.setPlaceholder('http://localhost:8080')
				.setValue(this.plugin.settings.serverUrl)
				.onChange(async (value) => {
					this.plugin.settings.serverUrl = value;
					await this.plugin.saveSettings();
				}));
		
		// ===== Server Tokens =====
		containerEl.createEl('h2', { text: 'Server Tokens' });
		containerEl.createEl('p', { 
			text: 'Manage authentication tokens for each server URL. Each server needs its own token.',
			cls: 'setting-item-description'
		});
		
		const serverTokensContainer = containerEl.createDiv({ cls: 'obs-publisher-server-tokens' });
		this.renderServerTokens(serverTokensContainer);
		
		// ===== Publish Profiles =====
		containerEl.createEl('h2', { text: 'Publish Profiles' });
		containerEl.createEl('p', { 
			text: 'Manage multiple publishing configurations. Each profile can publish a different folder to a unique site name.',
			cls: 'setting-item-description'
		});
		
		const profilesContainer = containerEl.createDiv({ cls: 'obs-publisher-profiles' });
		this.renderPublishProfiles(profilesContainer);
		
		new Setting(containerEl)
			.setName('Add New Profile')
			.setDesc('Create a new publishing profile')
			.addButton(button => button
				.setButtonText('Add Profile')
				.setCta()
				.onClick(() => {
					this.openProfileEditor(null, profilesContainer);
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
					if (!this._clearClickedOnce) {
						this._clearClickedOnce = true;
						new Notice('Click again to confirm clearing history');
						return;
					}
					this._clearClickedOnce = false;
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
					href: entry.siteUrl
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
		
		const serverUrl = this.plugin.settings.serverUrl;
		const token = this.plugin.settings.serverTokens[serverUrl] || '';
		
		if (!token) {
			new Notice('❌ No token configured for default server. Please add a token in Server Tokens section.');
			return;
		}
		
		try {
			new Notice('Testing connection...');
			
			// Simple ping test
			const response = await fetch(`${serverUrl}/auth/me`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`
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

	/**
	 * Render server tokens list
	 */
	private renderServerTokens(container: HTMLElement): void {
		container.empty();
		
		// Collect all unique server URLs (including default server)
		const allServerUrls = new Set<string>();
		
		// Always include the default server URL
		if (this.plugin.settings.serverUrl) {
			allServerUrls.add(this.plugin.settings.serverUrl);
		}
		
		// Add custom server URLs from profiles
		for (const profile of this.plugin.settings.profiles) {
			if (profile.serverUrl) {
				allServerUrls.add(profile.serverUrl);
			}
		}
		
		if (allServerUrls.size === 0) {
			container.createEl('p', { 
				text: 'No server URLs configured. Set a default server URL above.',
				cls: 'obs-publisher-empty-list'
			});
			return;
		}
		
		const list = container.createDiv({ cls: 'obs-publisher-token-list' });
		
		for (const serverUrl of allServerUrls) {
			const token = this.plugin.settings.serverTokens[serverUrl] || '';
			const hasToken = !!token;
			const isDefault = serverUrl === this.plugin.settings.serverUrl;
			
			const item = list.createDiv({ 
				cls: `obs-publisher-token-item ${hasToken ? '' : 'missing-token'}`
			});
			
			// Server URL display
			const urlRow = item.createDiv({ cls: 'obs-publisher-token-url' });
			urlRow.createSpan({ 
				text: hasToken ? '🔑' : '⚠️',
				cls: 'obs-publisher-token-status'
			});
			urlRow.createSpan({ 
				text: serverUrl + (isDefault ? ' (default)' : ''),
				cls: 'obs-publisher-token-server'
			});
			
			// Token input
			new Setting(item)
				.setName('')
				.setDesc(hasToken ? 'Token configured' : 'Token required - publishing will fail without it')
				.addText(text => {
					text
						.setPlaceholder('Enter token for this server')
						.setValue(token)
						.onChange(async (value) => {
							this.plugin.settings.serverTokens[serverUrl] = value;
							await this.plugin.saveSettings();
							// Re-render to update status icon
							this.renderServerTokens(container);
						});
					// text.inputEl.type = 'password';
					return text;
				})
				.addButton(button => button
					.setButtonText('Test')
					.onClick(async () => {
						await this.testConnectionToServer(serverUrl, this.plugin.settings.serverTokens[serverUrl] || '');
					}));
		}
	}

	/**
	 * Test connection to a specific server
	 */
	private async testConnectionToServer(serverUrl: string, token: string): Promise<void> {
		if (!token) {
			new Notice('❌ No token configured for this server');
			return;
		}
		
		try {
			new Notice('Testing connection...');
			
			const response = await fetch(`${serverUrl}/auth/me`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			
			if (response.ok) {
				new Notice(`✅ Connection to ${serverUrl} successful!`);
			} else {
				new Notice(`❌ Connection failed: ${response.status} ${response.statusText}`);
			}
		} catch (error) {
			new Notice(`❌ Connection failed: ${error}`);
		}
	}

	/**
	 * Render publish profiles list
	 */
	private renderPublishProfiles(container: HTMLElement): void {
		container.empty();
		
		const profiles = this.plugin.settings.profiles;
		
		if (profiles.length === 0) {
			container.createEl('p', { 
				text: 'No profiles configured. Click "Add Profile" to create one.',
				cls: 'obs-publisher-empty-list'
			});
			return;
		}
		
		const list = container.createDiv({ cls: 'obs-publisher-profile-list' });
		
		for (const profile of profiles) {
			const isActive = profile.id === this.plugin.settings.activeProfileId;
			const item = list.createDiv({ 
				cls: `obs-publisher-profile-item ${isActive ? 'active' : ''} ${!profile.enabled ? 'disabled' : ''}`
			});
			
			// Add right-click context menu
			item.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				this.showProfileContextMenu(e, profile, container);
			});
			
			// Profile header row
			const headerRow = item.createDiv({ cls: 'obs-publisher-profile-header' });
			
			// Status indicator and name
			const nameSection = headerRow.createDiv({ cls: 'obs-publisher-profile-name-section' });
			const statusIcon = profile.enabled ? '●' : '○';
			const activeIcon = isActive ? ' ★' : '';
			nameSection.createSpan({ 
				text: `${statusIcon} ${profile.name}${activeIcon}`,
				cls: 'obs-publisher-profile-name'
			});
			
			// Site name badge
			nameSection.createSpan({
				text: profile.siteName,
				cls: 'obs-publisher-profile-sitename'
			});
			
			// Actions
			const actionsSection = headerRow.createDiv({ cls: 'obs-publisher-profile-actions' });
			
			// Set Active button
			if (!isActive && profile.enabled) {
				const activateBtn = actionsSection.createEl('button', { 
					text: 'Set Active',
					cls: 'obs-publisher-btn obs-publisher-btn-small'
				});
				activateBtn.onclick = async () => {
					this.plugin.settings.activeProfileId = profile.id;
					await this.plugin.saveSettings();
					this.renderPublishProfiles(container);
					new Notice(`Profile "${profile.name}" is now active`);
				};
			}
			
			// Edit button
			const editBtn = actionsSection.createEl('button', { 
				text: 'Edit',
				cls: 'obs-publisher-btn obs-publisher-btn-small'
			});
			editBtn.onclick = () => {
				this.openProfileEditor(profile, container);
			};
			
			// Delete button
			const deleteBtn = actionsSection.createEl('button', { 
				text: '×',
				cls: 'obs-publisher-btn obs-publisher-btn-small obs-publisher-btn-danger'
			});
			deleteBtn.onclick = async () => {
				if (confirm(`Delete profile "${profile.name}"?`)) {
					this.plugin.settings.profiles = this.plugin.settings.profiles.filter(p => p.id !== profile.id);
					if (this.plugin.settings.activeProfileId === profile.id) {
						this.plugin.settings.activeProfileId = this.plugin.settings.profiles[0]?.id || null;
					}
					await this.plugin.saveSettings();
					this.renderPublishProfiles(container);
					new Notice('Profile deleted');
				}
			};
			
			// Details row
			const detailsRow = item.createDiv({ cls: 'obs-publisher-profile-details' });
			detailsRow.createSpan({ 
				text: `📁 ${profile.sourceDir}`,
				cls: 'obs-publisher-profile-detail'
			});
			if (profile.lastPublished) {
				const date = new Date(profile.lastPublished).toLocaleString();
				detailsRow.createSpan({ 
					text: `🕐 ${date}`,
					cls: 'obs-publisher-profile-detail'
				});
			}
			if (profile.description) {
				detailsRow.createSpan({ 
					text: profile.description,
					cls: 'obs-publisher-profile-description'
				});
			}
		}
	}

	/**
	 * Show context menu for profile
	 */
	private showProfileContextMenu(event: MouseEvent, profile: PublishProfile, container: HTMLElement): void {
		const menu = new Menu();
		const profiles = this.plugin.settings.profiles;
		const currentIndex = profiles.findIndex(p => p.id === profile.id);
		
		// Move Up
		if (currentIndex > 0) {
			menu.addItem((item) => {
				item
					.setTitle('Move Up')
					.setIcon('arrow-up')
					.onClick(async () => {
						await this.moveProfile(profile, 'up', container);
					});
			});
		}
		
		// Move Down
		if (currentIndex < profiles.length - 1) {
			menu.addItem((item) => {
				item
					.setTitle('Move Down')
					.setIcon('arrow-down')
					.onClick(async () => {
						await this.moveProfile(profile, 'down', container);
					});
			});
		}
		
		if (currentIndex > 0 || currentIndex < profiles.length - 1) {
			menu.addSeparator();
		}
		
		menu.addItem((item) => {
			item
				.setTitle('Duplicate Profile')
				.setIcon('copy')
				.onClick(async () => {
					await this.duplicateProfile(profile, container);
				});
		});
		
		menu.addSeparator();
		
		menu.addItem((item) => {
			item
				.setTitle('Edit')
				.setIcon('pencil')
				.onClick(() => {
					this.openProfileEditor(profile, container);
				});
		});
		
		if (profile.enabled && profile.id !== this.plugin.settings.activeProfileId) {
			menu.addItem((item) => {
				item
					.setTitle('Set as Active')
					.setIcon('check')
					.onClick(async () => {
						this.plugin.settings.activeProfileId = profile.id;
						await this.plugin.saveSettings();
						this.renderPublishProfiles(container);
						new Notice(`Profile "${profile.name}" is now active`);
					});
			});
		}
		
		menu.addSeparator();
		
		menu.addItem((item) => {
			item
				.setTitle('Delete')
				.setIcon('trash')
				.onClick(async () => {
					if (confirm(`Delete profile "${profile.name}"?`)) {
						this.plugin.settings.profiles = this.plugin.settings.profiles.filter(p => p.id !== profile.id);
						if (this.plugin.settings.activeProfileId === profile.id) {
							this.plugin.settings.activeProfileId = this.plugin.settings.profiles[0]?.id || null;
						}
						await this.plugin.saveSettings();
						this.renderPublishProfiles(container);
						new Notice('Profile deleted');
					}
				});
		});
		
		menu.showAtMouseEvent(event);
	}

	/**
	 * Move a profile up or down in the list
	 */
	private async moveProfile(profile: PublishProfile, direction: 'up' | 'down', container: HTMLElement): Promise<void> {
		const profiles = this.plugin.settings.profiles;
		const currentIndex = profiles.findIndex(p => p.id === profile.id);
		
		if (currentIndex === -1) return;
		
		const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
		
		// Check bounds
		if (newIndex < 0 || newIndex >= profiles.length) return;
		
		// Swap profiles
		[profiles[currentIndex], profiles[newIndex]] = [profiles[newIndex], profiles[currentIndex]];
		
		await this.plugin.saveSettings();
		this.renderPublishProfiles(container);
	}

	/**
	 * Duplicate a profile
	 */
	private async duplicateProfile(profile: PublishProfile, container: HTMLElement): Promise<void> {
		const { generateProfileId } = await import('../settings');
		
		// Create a copy with new id and modified name
		const duplicated: PublishProfile = {
			...profile,
			id: generateProfileId(),
			name: `${profile.name} (Copy)`,
			lastPublished: undefined,
			lastPublishUrl: undefined
		};
		
		this.plugin.settings.profiles.push(duplicated);
		await this.plugin.saveSettings();
		this.renderPublishProfiles(container);
		new Notice(`Profile duplicated as "${duplicated.name}"`);
		
		// Open editor for the new profile so user can modify it
		this.openProfileEditor(duplicated, container);
	}

	/**
	 * Open profile editor modal
	 */
	private openProfileEditor(profile: PublishProfile | null, container: HTMLElement): void {
		const modal = new ProfileEditorModal(
			this.app, 
			profile, 
			async (savedProfile) => {
				if (profile) {
					// Update existing profile
					const index = this.plugin.settings.profiles.findIndex(p => p.id === profile.id);
					if (index !== -1) {
						this.plugin.settings.profiles[index] = savedProfile;
					}
				} else {
					// Add new profile
					this.plugin.settings.profiles.push(savedProfile);
					// If first profile, set as active
					if (this.plugin.settings.profiles.length === 1) {
						this.plugin.settings.activeProfileId = savedProfile.id;
					}
				}
				await this.plugin.saveSettings();
				this.renderPublishProfiles(container);
				new Notice(profile ? 'Profile updated' : 'Profile created');
			}
		);
		modal.open();
	}
}

/**
 * Modal for editing a publish profile
 */
class ProfileEditorModal extends Modal {
	private profile: PublishProfile;
	private isNew: boolean;
	private onSave: (profile: PublishProfile) => void;

	constructor(app: App, profile: PublishProfile | null, onSave: (profile: PublishProfile) => void) {
		super(app);
		this.isNew = !profile;
		this.profile = profile ? { ...profile } : createDefaultProfile('New Profile');
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		
		contentEl.createEl('h2', { text: this.isNew ? 'Create New Profile' : 'Edit Profile' });
		
		// Profile Name
		new Setting(contentEl)
			.setName('Profile Name')
			.setDesc('Display name for this profile')
			.addText(text => text
				.setPlaceholder('My Site')
				.setValue(this.profile.name)
				.onChange(value => {
					this.profile.name = value;
				}));
		
		// Site Name
		new Setting(contentEl)
			.setName('Site Name')
			.setDesc('URL-safe name used in the site path (e.g., "my-blog" → /sites/my-blog/)')
			.addText(text => text
				.setPlaceholder('my-blog')
				.setValue(this.profile.siteName)
				.onChange(value => {
					// Auto-sanitize to URL-safe characters
					this.profile.siteName = value.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
				}));
		
		// Source Directory
		let sourceDirText: TextComponent;
		new Setting(contentEl)
			.setName('Source Directory')
			.setDesc('Path to the folder to publish (relative to vault root, use "." for entire vault)')
			.addText(text => {
				sourceDirText = text;
				text.setPlaceholder('.')
					.setValue(this.profile.sourceDir)
					.onChange(value => {
						this.profile.sourceDir = value || '.';
					});
			})
			.addButton(button => button
				.setIcon('folder')
				.setTooltip('Browse folders')
				.onClick(() => {
					const modal = new FolderSuggestModal(this.app, (folder) => {
						this.profile.sourceDir = folder;
						sourceDirText.setValue(folder);
					});
					modal.open();
				}));
		
		// Custom Server URL
		new Setting(contentEl)
			.setName('Custom Server URL')
			.setDesc('Optional: Use a different server for this profile (leave empty to use default)')
			.addText(text => text
				.setPlaceholder('https://example.com (empty = use default)')
				.setValue(this.profile.serverUrl || '')
				.onChange(value => {
					this.profile.serverUrl = value.trim() || undefined;
				}));
		
		// Enabled
		new Setting(contentEl)
			.setName('Enabled')
			.setDesc('Whether this profile is available for publishing')
			.addToggle(toggle => toggle
				.setValue(this.profile.enabled)
				.onChange(value => {
					this.profile.enabled = value;
				}));
		
		// Description
		new Setting(contentEl)
			.setName('Description')
			.setDesc('Optional description for this profile')
			.addTextArea(text => text
				.setPlaceholder('Optional notes about this profile...')
				.setValue(this.profile.description || '')
				.onChange(value => {
					this.profile.description = value;
				}));
		
		// Buttons
		const buttonRow = contentEl.createDiv({ cls: 'obs-publisher-modal-buttons' });
		
		const cancelBtn = buttonRow.createEl('button', { text: 'Cancel' });
		cancelBtn.onclick = () => this.close();
		
		const saveBtn = buttonRow.createEl('button', { text: 'Save', cls: 'mod-cta' });
		saveBtn.onclick = () => {
			// Validate
			if (!this.profile.name.trim()) {
				new Notice('Profile name is required');
				return;
			}
			if (!this.profile.siteName.trim()) {
				new Notice('Site name is required');
				return;
			}
			if (!/^[a-z0-9-_]+$/.test(this.profile.siteName)) {
				new Notice('Site name can only contain lowercase letters, numbers, hyphens, and underscores');
				return;
			}
			
			this.onSave(this.profile);
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
