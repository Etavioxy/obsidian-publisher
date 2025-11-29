import fs from './utils/fs';
import * as path from 'path';
import { promptForCredentials } from './auth';
import { log, loggerManager, Logger, ProgressContext } from './utils/logger';

export interface UploadOptions {
  serverUrl: string;
  token?: string;
  siteName: string;
  metaPath?: string;
  progressContext?: ProgressContext;
  customLogger?: Partial<Logger>;
  customLoggerKey?: string;
  /** If true, prompt for credentials when token is missing (CLI only) */
  allowPrompt?: boolean;
}

export interface UploadResult {
  id: string;
  url: string;
  url_by_id?: string;
  message: string;
}

export async function uploadArchive(archivePath: string, options: UploadOptions): Promise<UploadResult> {
  const originalLoggerKey = loggerManager.getCurrent();
  const switchedLoggerKey = loggerManager.useCustom(options.customLogger, options.customLoggerKey);

  const { serverUrl, token: tokenFromOption, metaPath } = options;
  
  log.progress(`📤 Uploading to ${serverUrl}...`, 0, options.progressContext);
  
  // 检查文件是否存在
  if (!await fs.pathExists(archivePath)) {
    throw new Error(`Archive file not found: ${archivePath}`);
  }
  
  const stats = await fs.stat(archivePath);
  log.info(`📤 Uploading ${(stats.size / 1024 / 1024).toFixed(2)} MB...`);
  
  // Read site-meta.json to obtain uuid
  let siteUuid: string | undefined = undefined;

  if (metaPath && await fs.pathExists(metaPath)) {
    const content = await fs.readFile(metaPath, 'utf-8');
    const parsed = JSON.parse(content);
    if (parsed && parsed.siteId) {
      siteUuid = parsed.siteId;
    }
  }

  if (!siteUuid) {
    throw new Error('Missing site uuid: cannot find site-meta.json. If you are using the `upload` command, provide --meta <path_to_site-meta.json>');
  }

  // If no token provided, prompt for credentials and request one from the server
  let token = tokenFromOption;
  if (!token) {
    if (options.allowPrompt) {
      // CLI mode: prompt for credentials
      try {
        token = await promptForCredentials(serverUrl);
      } catch (error) {
        log.error('Upload error:', error);
        throw new Error('Aborted upload: authentication is required');
      }
    } else {
      // Non-CLI mode (plugin): require token to be provided
      throw new Error('Missing authentication token. Please provide a token or login first.');
    }
  }

  // 创建 FormData
  const fileBuffer = await fs.readFile(archivePath);
  const fileName = path.basename(archivePath);
  
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(fileBuffer)]);
  formData.append('uuid', siteUuid);
  formData.append('site', blob, fileName);
  
  log.debug(`🔐 Token: ${token}`);
  
  try {
    // Pre-validate token with a lightweight request before uploading large body
    // This prevents wasted bandwidth and ECONNABORTED on auth failure
    const authCheckResponse = await fetch(`${serverUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!authCheckResponse.ok) {
      const errorText = await authCheckResponse.text();
      throw new Error(`Authentication failed: ${authCheckResponse.status} ${authCheckResponse.statusText}\n${errorText}`);
    }
    
    // Token is valid, proceed with upload
    const response = await fetch(`${serverUrl}/api/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const result = await response.json();
    return result;
    
  } finally {
    // Restore original logger
    if (switchedLoggerKey && loggerManager.getCurrent() !== originalLoggerKey) {
      loggerManager.switch(originalLoggerKey);
    }
  }
}