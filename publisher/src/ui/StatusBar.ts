/**
 * Status bar component
 * Displays publish status and provides quick actions
 */

import { setIcon } from 'obsidian';

export type PublishStatus = 'idle' | 'building' | 'uploading' | 'success' | 'error';

/**
 * Status bar manager
 */
export class StatusBarManager {
	private statusBarItem: HTMLElement;
	private currentStatus: PublishStatus = 'idle';
	private statusText: string = '';
	
	constructor(statusBarItem: HTMLElement) {
		this.statusBarItem = statusBarItem;
		this.render();
	}
	
	/**
	 * Update status
	 */
	setStatus(status: PublishStatus, text?: string): void {
		this.currentStatus = status;
		if (text) {
			this.statusText = text;
		}
		this.render();
	}
	
	/**
	 * Set custom text
	 */
	setText(text: string): void {
		this.statusText = text;
		this.render();
	}
	
	/**
	 * Clear status
	 */
	clear(): void {
		this.currentStatus = 'idle';
		this.statusText = '';
		this.render();
	}
	
	/**
	 * Show progress
	 */
	showProgress(stage: string, progress: number): void {
		this.statusText = `${stage}: ${Math.round(progress)}%`;
		this.render();
	}
	
	/**
	 * Render the status bar
	 */
	private render(): void {
		this.statusBarItem.empty();
		
		// Create container
		const container = this.statusBarItem.createDiv({ cls: 'obs-publisher-status' });
		
		// Add icon
		const iconEl = container.createSpan({ cls: 'obs-publisher-icon' });
		const icon = this.getIconForStatus(this.currentStatus);
		setIcon(iconEl, icon);
		
		// Add status indicator
		const indicatorEl = container.createSpan({ 
			cls: `obs-publisher-indicator obs-publisher-indicator-${this.currentStatus}` 
		});
		
		// Add text
		if (this.statusText) {
			container.createSpan({ 
				cls: 'obs-publisher-text',
				text: this.statusText 
			});
		} else {
			const defaultText = this.getDefaultTextForStatus(this.currentStatus);
			if (defaultText) {
				container.createSpan({ 
					cls: 'obs-publisher-text',
					text: defaultText 
				});
			}
		}
		
		// Add tooltip
		container.setAttribute('aria-label', this.getTooltipForStatus(this.currentStatus));
		
		// Make it clickable
		container.addClass('clickable-icon');
	}
	
	/**
	 * Get icon for status
	 */
	private getIconForStatus(status: PublishStatus): string {
		switch (status) {
			case 'idle':
				return 'upload-cloud';
			case 'building':
				return 'loader';
			case 'uploading':
				return 'upload';
			case 'success':
				return 'check-circle';
			case 'error':
				return 'alert-circle';
			default:
				return 'upload-cloud';
		}
	}
	
	/**
	 * Get default text for status
	 */
	private getDefaultTextForStatus(status: PublishStatus): string {
		switch (status) {
			case 'idle':
				return 'Publisher';
			case 'building':
				return 'Building...';
			case 'uploading':
				return 'Uploading...';
			case 'success':
				return 'Published';
			case 'error':
				return 'Failed';
			default:
				return '';
		}
	}
	
	/**
	 * Get tooltip for status
	 */
	private getTooltipForStatus(status: PublishStatus): string {
		switch (status) {
			case 'idle':
				return 'Obsidian Publisher - Click to publish';
			case 'building':
				return 'Building site...';
			case 'uploading':
				return 'Uploading to server...';
			case 'success':
				return 'Successfully published! Click for details';
			case 'error':
				return 'Publish failed. Click for details';
			default:
				return 'Obsidian Publisher';
		}
	}
	
	/**
	 * Add click handler
	 */
	onClick(handler: () => void): void {
		this.statusBarItem.addEventListener('click', handler);
	}
	
	/**
	 * Remove the status bar
	 */
	destroy(): void {
		this.statusBarItem.empty();
	}
}
