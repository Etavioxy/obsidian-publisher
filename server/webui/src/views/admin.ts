/**
 * Admin Panel View (/admin)
 */

import { authStore } from '../state/auth';
import { router } from '../router';
import { Button, Card, Alert } from '../ui/components';

export function createAdminView(): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4';

  // Header with user info and navigation
  const header = document.createElement('div');
  header.className = 'max-w-4xl mx-auto mb-6 flex justify-between items-center';

  const title = document.createElement('h1');
  title.className = 'text-3xl font-bold text-gray-900 dark:text-gray-100';
  title.textContent = 'Admin Panel';
  header.appendChild(title);

  const nav = document.createElement('div');
  nav.className = 'flex gap-2';

  const backBtn = Button({
    text: 'Back to Profile',
    variant: 'secondary',
    onClick: () => router.navigate('me'),
  });

  const logoutBtn = Button({
    text: 'Logout',
    variant: 'secondary',
    onClick: () => {
      authStore.clear();
      router.navigate('login');
    },
  });

  nav.appendChild(backBtn);
  nav.appendChild(logoutBtn);
  header.appendChild(nav);

  container.appendChild(header);

  // Content area
  const content = document.createElement('div');
  content.className = 'max-w-4xl mx-auto space-y-6';

  // Main card
  const card = Card({
    title: 'Welcome to Admin Panel',
    children: createAdminContent(),
  });

  content.appendChild(card);

  container.appendChild(content);

  return container;
}

function createAdminContent(): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'space-y-4';

  // Placeholder message
  const message = document.createElement('p');
  message.className = 'text-gray-700';
  message.innerHTML = `
    <strong>Admin features coming soon!</strong><br>
    This panel will provide administration capabilities including:
    <ul class="list-disc list-inside mt-2 space-y-1">
      <li>Site management and configuration</li>
      <li>User management</li>
      <li>System statistics and monitoring</li>
      <li>Settings and preferences</li>
    </ul>
  `;

  div.appendChild(message);

  return div;
}
