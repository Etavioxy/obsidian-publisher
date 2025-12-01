/**
 * Publish modal - Interactive UI for publishing operations
 */

import { App, Modal, Notice, ButtonComponent, TextComponent, DropdownComponent } from 'obsidian';
import { CommandExecutor } from '../commands';
import { PublisherSettings, CommandContext, UploadResult, PublishProfile } from '../types';
import { getTokenForServer } from '../settings';
import path from 'path';

/**
 * Publish modal for interactive publishing
 */
export class PublishModal extends Modal {
	private settings: PublisherSettings;
	private activeProfile: PublishProfile | null;
	private onPublishComplete?: (result: UploadResult, profile?: PublishProfile) => void;
	private onProfileChanged?: (profileId: string) => void;
	
	private profileInfoContainer: HTMLElement;
	private serverUrlDisplay: HTMLElement;
	private logContainer: HTMLElement;
	private progressBar: HTMLElement;
	private progressText: HTMLElement;
	private progressNodesContainer: HTMLElement;
	private publishButton: ButtonComponent;
	private cancelButton: ButtonComponent;
	
	private isPublishing: boolean = false;
	private logs: string[] = [];
	private progressNodes: { progress: number; message: string }[] = [];
	
	constructor(
		app: App, 
		settings: PublisherSettings,
		activeProfile: PublishProfile | null,
		onPublishComplete?: (result: UploadResult, profile?: PublishProfile) => void,
		onProfileChanged?: (profileId: string) => void
	) {
		super(app);
		this.settings = settings;
		this.activeProfile = activeProfile;
		this.onPublishComplete = onPublishComplete;
		this.onProfileChanged = onProfileChanged;
	}
	
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obs-publisher-modal');
		
		// Title
		contentEl.createEl('h2', { text: 'Publish to Server' });
		
		// Get enabled profiles
		const enabledProfiles = this.settings.profiles.filter(p => p.enabled);
		
		// Check if there are any profiles
		if (enabledProfiles.length === 0) {
			const warning = contentEl.createDiv({ cls: 'obs-publisher-warning' });
			warning.createEl('p', { 
				text: '⚠️ No profiles available. Please create a profile in settings.',
				cls: 'obs-publisher-warning-text'
			});
			
			new ButtonComponent(contentEl)
				.setButtonText('Close')
				.onClick(() => this.close());
			return;
		}
		
		// Profile selector
		const selectorContainer = contentEl.createDiv({ cls: 'obs-publisher-profile-selector' });
		selectorContainer.createEl('label', { 
			text: 'Select Profile:',
			cls: 'obs-publisher-selector-label'
		});
		
		const dropdown = new DropdownComponent(selectorContainer);
		for (const profile of enabledProfiles) {
			dropdown.addOption(profile.id, profile.name);
		}
		
		// Set current active profile
		if (this.activeProfile) {
			dropdown.setValue(this.activeProfile.id);
		} else if (enabledProfiles.length > 0) {
			// Default to first enabled profile
			this.activeProfile = enabledProfiles[0];
			dropdown.setValue(enabledProfiles[0].id);
		}
		
		dropdown.onChange((value) => {
			const selected = this.settings.profiles.find(p => p.id === value);
			if (selected) {
				this.activeProfile = selected;
				this.updateProfileInfo();
				// Notify parent about profile change
				if (this.onProfileChanged) {
					this.onProfileChanged(value);
				}
			}
		});
		
		// Server info - will be updated with profile selection
		const infoContainer = contentEl.createDiv({ cls: 'obs-publisher-info' });
		this.serverUrlDisplay = infoContainer.createEl('p', { 
			text: `Server: ${this.getEffectiveServerUrl()}`,
			cls: 'obs-publisher-server-url'
		});
		
		// Profile info (will be updated when selection changes)
		this.profileInfoContainer = infoContainer.createDiv({ cls: 'obs-publisher-profile-info' });
		this.updateProfileInfo();
		
		// Progress section
		const progressContainer = contentEl.createDiv({ cls: 'obs-publisher-progress' });
		
		this.progressText = progressContainer.createEl('div', { 
			text: 'Ready to publish',
			cls: 'obs-publisher-progress-text'
		});
		
		const progressBarContainer = progressContainer.createDiv({ 
			cls: 'obs-publisher-progress-bar-container' 
		});
		this.progressBar = progressBarContainer.createDiv({ 
			cls: 'obs-publisher-progress-bar' 
		});
		this.progressBar.style.width = '0%';
		
		// Container for progress nodes (hoverable dots)
		this.progressNodesContainer = progressBarContainer.createDiv({
			cls: 'obs-publisher-progress-nodes'
		});
		
		// Log output
		const logSection = contentEl.createDiv({ cls: 'obs-publisher-log-section' });
		logSection.createEl('h3', { text: 'Output Log' });
		
		this.logContainer = logSection.createDiv({ cls: 'obs-publisher-log' });
		this.logContainer.createEl('div', { 
			text: 'Waiting to start...',
			cls: 'obs-publisher-log-entry' 
		});
		
		// Action buttons
		const buttonContainer = contentEl.createDiv({ cls: 'obs-publisher-buttons' });
		
		this.publishButton = new ButtonComponent(buttonContainer)
			.setButtonText('Publish')
			.setCta()
			.onClick(() => this.startPublish());
		
		this.cancelButton = new ButtonComponent(buttonContainer)
			.setButtonText('Cancel')
			.onClick(() => this.close());
	}
	
	/**
	 * Start publish process
	 */
	private async startPublish(): Promise<void> {
		if (this.isPublishing || !this.activeProfile) {
			return;
		}

		// Use profile's custom server URL if set, otherwise use default
		const serverUrl = this.getEffectiveServerUrl();
		
		// Get token for this server
		const token = getTokenForServer(this.settings, serverUrl);
		
		// Validate token
		if (!token) {
			new Notice(`❌ No authentication token configured for server: ${serverUrl}\nPlease configure it in Settings → Server Tokens`, 10000);
			return;
		}

		this.isPublishing = true;
		this.publishButton.setDisabled(true);
		this.cancelButton.setButtonText('Close');

		// Clear logs and progress nodes
		this.logs = [];
		this.progressNodes = [];
		this.logContainer.empty();
		this.progressNodesContainer.empty();
		this.updateProgress(0, 'Starting publish process...');

		// Create command context
		const context: CommandContext = {
			onProgress: (stage, progress, message) => {
				this.updateProgress(progress, message || stage);
			},
			onLog: (message) => {
				this.addLog(message);
			},
			onError: (error) => {
				this.addLog(`Error: ${error.message}`, 'error');
			}
		};

		// Determine source path based on profile
		const vaultBasePath = (this.app.vault.adapter as any).basePath || '.';
		const sourcePath = this.activeProfile.sourceDir === '.' 
			? vaultBasePath 
			: path.join(vaultBasePath, this.activeProfile.sourceDir);
		const basePath = this.settings.basePath || vaultBasePath;
		
		const result = await CommandExecutor.publish({
			vaultPath: sourcePath,
			serverUrl: serverUrl,
			token: token,
			siteName: this.activeProfile.siteName,
			excludePatterns: this.settings.excludePatterns,
			keepTemp: this.settings.keepTempFiles,
			basePath: basePath
		}, context);

		// Handle result
		if (result.success) {
			this.updateProgress(100, '✅ Published successfully!');
			this.addLog(`\n🎉 Site URL: ${result.data.url} ${result.data.url_by_id ? 'or ID URL: ' + result.data.url_by_id : ''}`, 'success');

			if (this.settings.showNotifications) {
				new Notice(`Published successfully! Site URL: ${result.data.url}`, 10000);
			}

			// Call completion callback
			if (this.onPublishComplete && result.data) {
				this.onPublishComplete(result.data, this.activeProfile || undefined);
			}

			// Auto-close after a delay
			setTimeout(() => {
				if (!this.isPublishing) return;
				this.close();
			}, 3000);
		} else {
			this.updateProgress(0, '❌ Publish failed');

			if (this.settings.showNotifications) {
				new Notice(`Publish failed: ${result.message}`, 10000);
			}
		}

		this.isPublishing = false;
		this.publishButton.setDisabled(false);
		this.publishButton.setButtonText('Publish Again');
	}
	
	/**
	 * Update progress bar
	 */
	private updateProgress(progress: number, text: string): void {
		this.progressBar.style.width = `${progress}%`;
		this.progressText.textContent = text;
		
		// Add color coding
		if (progress === 100) {
			this.progressBar.addClass('obs-publisher-progress-complete');
		} else {
			this.progressBar.removeClass('obs-publisher-progress-complete');
		}
		
		// Add progress node (hoverable dot) if progress changed
		const lastNode = this.progressNodes[this.progressNodes.length - 1];
		if (!lastNode || lastNode.progress !== progress) {
			this.progressNodes.push({ progress, message: text });
			this.addProgressNode(progress, text);
		}
	}
	
	/**
	 * Add a progress node (hoverable dot) to the progress bar
	 */
	private addProgressNode(progress: number, message: string): void {
		const node = this.progressNodesContainer.createDiv({
			cls: 'obs-publisher-progress-node'
		});
		node.style.left = `${progress}%`;
		node.setAttribute('aria-label', `${progress}% - ${message}`);
	}
	
	/**
	 * Update profile info display
	 */
	private updateProfileInfo(): void {
		if (!this.profileInfoContainer || !this.activeProfile) return;
		
		this.profileInfoContainer.empty();
		
		this.profileInfoContainer.createEl('p', { 
			text: `Profile: ${this.activeProfile.name}`,
			cls: 'obs-publisher-profile-name'
		});
		this.profileInfoContainer.createEl('p', { 
			text: `Site Name: ${this.activeProfile.siteName}`,
			cls: 'obs-publisher-site-name'
		});
		this.profileInfoContainer.createEl('p', { 
			text: `Source: ${this.activeProfile.sourceDir}`,
			cls: 'obs-publisher-source-dir'
		});
		
		// Update server URL display
		if (this.serverUrlDisplay) {
			const serverUrl = this.getEffectiveServerUrl();
			const isCustom = this.activeProfile.serverUrl ? ' (custom)' : '';
			this.serverUrlDisplay.textContent = `Server: ${serverUrl}${isCustom}`;
		}
	}
	
	/**
	 * Get the effective server URL (profile's custom URL or default)
	 */
	private getEffectiveServerUrl(): string {
		if (this.activeProfile?.serverUrl) {
			return this.activeProfile.serverUrl;
		}
		return this.settings.serverUrl;
	}
	
	/**
	 * Add log entry
	 */
	private addLog(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
		this.logs.push(message);
		
		const logEntry = this.logContainer.createDiv({ 
			cls: `obs-publisher-log-entry obs-publisher-log-${type}` 
		});
		logEntry.textContent = message;
		
		// Auto-scroll to bottom
		this.logContainer.scrollTop = this.logContainer.scrollHeight;
	}
	
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Build-only modal for testing builds without uploading
 */
export class BuildModal extends Modal {
	private settings: PublisherSettings;
	
	private logContainer: HTMLElement;
	private progressBar: HTMLElement;
	private progressText: HTMLElement;
	private progressNodesContainer: HTMLElement;
	private buildButton: ButtonComponent;
	
	private isBuilding: boolean = false;
	private progressNodes: { progress: number; message: string }[] = [];
	
	constructor(app: App, settings: PublisherSettings) {
		super(app);
		this.settings = settings;
	}
	
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obs-publisher-modal');
		
		contentEl.createEl('h2', { text: 'Build Site' });
		
		// Info
		const infoContainer = contentEl.createDiv({ cls: 'obs-publisher-info' });
		infoContainer.createEl('p', { 
			text: `Vault: ${this.settings.vaultPath || this.app.vault.getName()}`,
			cls: 'obs-publisher-vault-path'
		});
		infoContainer.createEl('p', { 
			text: `Output: ${this.settings.outputDir}`,
			cls: 'obs-publisher-output-dir'
		});
		
		// Progress section
		const progressContainer = contentEl.createDiv({ cls: 'obs-publisher-progress' });
		
		this.progressText = progressContainer.createEl('div', { 
			text: 'Ready to build',
			cls: 'obs-publisher-progress-text'
		});
		
		const progressBarContainer = progressContainer.createDiv({ 
			cls: 'obs-publisher-progress-bar-container' 
		});
		this.progressBar = progressBarContainer.createDiv({ 
			cls: 'obs-publisher-progress-bar' 
		});
		this.progressBar.style.width = '0%';
		
		// Container for progress nodes (hoverable dots)
		this.progressNodesContainer = progressBarContainer.createDiv({
			cls: 'obs-publisher-progress-nodes'
		});
		
		// Log output
		const logSection = contentEl.createDiv({ cls: 'obs-publisher-log-section' });
		logSection.createEl('h3', { text: 'Build Log' });
		
		this.logContainer = logSection.createDiv({ cls: 'obs-publisher-log' });
		this.logContainer.createEl('div', { 
			text: 'Waiting to start...',
			cls: 'obs-publisher-log-entry' 
		});
		
		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'obs-publisher-buttons' });
		
		this.buildButton = new ButtonComponent(buttonContainer)
			.setButtonText('Build')
			.setCta()
			.onClick(() => this.startBuild());
		
		new ButtonComponent(buttonContainer)
			.setButtonText('Close')
			.onClick(() => this.close());
	}
	
	private async startBuild(): Promise<void> {
		if (this.isBuilding) return;

		this.isBuilding = true;
		this.buildButton.setDisabled(true);
		this.logContainer.empty();
		this.progressNodes = [];
		this.progressNodesContainer.empty();
		this.updateProgress(0, 'Starting build...');

		const context: CommandContext = {
			onProgress: (stage, progress, message) => {
				this.updateProgress(progress, message || stage);
			},
			onLog: (message) => {
				this.addLog(message);
			},
			onError: (error) => {
				this.addLog(`Error: ${error.message}`, 'error');
			}
		};

		const vaultPath = this.settings.vaultPath || (this.app.vault.adapter as any).basePath || '.';
		const basePath = (this.app.vault.adapter as any).basePath;
		const result = await CommandExecutor.build({
			vaultPath: vaultPath,
			outputDir: this.settings.outputDir,
			srcDir: this.settings.srcDir,
			excludePatterns: this.settings.excludePatterns,
			basePath: basePath
		}, context);

		if (result.success) {
			this.updateProgress(100, '✅ Build completed!');
			this.addLog(`\n✅ Output directory: ${result.data.outputDir}`, 'success');
			new Notice('Build completed successfully!');
		} else {
			this.updateProgress(0, '❌ Build failed');
			this.addLog(`\n${result.message}`, 'error');
			new Notice(`Build failed: ${result.message}`);
		}

		this.isBuilding = false;
		this.buildButton.setDisabled(false);
		this.buildButton.setButtonText('Build Again');
	}
	
	private updateProgress(progress: number, text: string): void {
		this.progressBar.style.width = `${progress}%`;
		this.progressText.textContent = text;
		
		// Add progress node (hoverable dot) if progress changed
		const lastNode = this.progressNodes[this.progressNodes.length - 1];
		if (!lastNode || lastNode.progress !== progress) {
			this.progressNodes.push({ progress, message: text });
			this.addProgressNode(progress, text);
		}
	}
	
	/**
	 * Add a progress node (hoverable dot) to the progress bar
	 */
	private addProgressNode(progress: number, message: string): void {
		const node = this.progressNodesContainer.createDiv({
			cls: 'obs-publisher-progress-node'
		});
		node.style.left = `${progress}%`;
		node.setAttribute('aria-label', `${progress}% - ${message}`);
	}
	
	private addLog(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
		const logEntry = this.logContainer.createDiv({ 
			cls: `obs-publisher-log-entry obs-publisher-log-${type}` 
		});
		logEntry.textContent = message;
		this.logContainer.scrollTop = this.logContainer.scrollHeight;
	}
	
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
