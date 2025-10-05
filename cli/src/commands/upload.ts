import * as fs from 'fs-extra';
import * as path from 'path';

export async function uploadSite(archivePath: string, serverUrl: string, token?: string) {
  console.log(`📤 Uploading ${archivePath} to ${serverUrl}...`);
  
  const fileBuffer = await fs.readFile(archivePath);
  
  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'application/gzip' });
  formData.append('site', blob, path.basename(archivePath));
  
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${serverUrl}/api/upload`, {
    method: 'POST',
    headers,
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} ${response.statusText}\n${errorText}`);
  }
  
  return await response.json();
}