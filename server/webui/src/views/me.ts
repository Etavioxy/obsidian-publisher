/**
 * User Profile View (/me)
 */

import { authStore, User } from '../state/auth';
import { themeStore } from '../state/theme';
import { authAPI, userAPI, ApiError } from '../api';
import { router } from '../router';
import { Button, Alert, Card, LoadingSpinner, ThemeToggle } from '../ui/components';

export function createMeView(): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4';

  // Header with user info, theme toggle, and logout
  const header = document.createElement('div');
  header.className = 'max-w-4xl mx-auto mb-6 flex justify-between items-center';

  const user = authStore.getUser();
  const title = document.createElement('h1');
  title.className = 'text-3xl font-bold text-gray-900 dark:text-gray-100';
  title.textContent = `Welcome, ${user?.username}!`;
  header.appendChild(title);

  // Right side buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'flex items-center gap-2';

  // Theme toggle
  const themeToggle = ThemeToggle();
  const updateThemeIcon = () => {
    const iconSpan = themeToggle.querySelector('span');
    if (iconSpan) {
      if (themeStore.isDark()) {
        iconSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`;
      } else {
        iconSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
      }
    }
  };
  updateThemeIcon();
  themeToggle.onclick = () => {
    themeStore.toggle();
    updateThemeIcon();
  };
  buttonsContainer.appendChild(themeToggle);

  const logoutBtn = Button({
    text: 'Logout',
    variant: 'secondary',
    onClick: () => {
      authStore.clear();
      router.navigate('login');
    },
  });
  buttonsContainer.appendChild(logoutBtn);
  
  header.appendChild(buttonsContainer);

  container.appendChild(header);

  // Content area
  const content = document.createElement('div');
  content.className = 'max-w-4xl mx-auto space-y-6';

  // User profile card
  const profileCard = Card({
    title: 'Profile',
    children: createProfileCard(),
  });

  // Stats card
  const statsCard = Card({
    title: 'Statistics',
    children: createStatsCard(),
  });

  content.appendChild(profileCard);
  content.appendChild(statsCard);

  container.appendChild(content);

  return container;
}

function createProfileCard(): HTMLDivElement {
  const div = document.createElement('div');
  const user = authStore.getUser();

  if (!user) {
    div.appendChild(Alert({
      type: 'error',
      message: 'User information not available',
    }));
    return div;
  }

  // User info
  const infoDiv = document.createElement('div');
  infoDiv.className = 'space-y-3 mb-6';

  const userIdRow = createInfoRow('User ID', user.id);
  const usernameRow = createInfoRow('Username', user.username);
  const createdAtRow = createInfoRow('Created At', new Date(user.created_at).toLocaleString());

  infoDiv.appendChild(userIdRow);
  infoDiv.appendChild(usernameRow);
  infoDiv.appendChild(createdAtRow);

  div.appendChild(infoDiv);

  // Divider
  const divider = document.createElement('hr');
  divider.className = 'my-4 border-gray-300';
  div.appendChild(divider);

  // Danger zone
  const dangerDiv = document.createElement('div');
  dangerDiv.className = 'pt-4';

  const dangerTitle = document.createElement('h3');
  dangerTitle.className = 'text-lg font-semibold text-red-600 mb-3';
  dangerTitle.textContent = 'Danger Zone';
  dangerDiv.appendChild(dangerTitle);

  const deleteBtn = Button({
    text: 'Delete Account',
    variant: 'danger',
    onClick: async () => {
      if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        try {
          await userAPI.deleteAccount();
          authStore.clear();
          router.navigate('login');
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to delete account';
          alert(message);
        }
      }
    },
  });

  dangerDiv.appendChild(deleteBtn);
  div.appendChild(dangerDiv);

  return div;
}

function createStatsCard(): HTMLDivElement {
  const div = document.createElement('div');

  const spinner = LoadingSpinner();
  div.appendChild(spinner);

  // Load stats
  userAPI
    .getStats()
    .then((stats) => {
      div.innerHTML = '';

      const statsGrid = document.createElement('div');
      statsGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4';

      // Example stats
      const statCards = [
        { label: 'Total Sites', value: stats.total_sites || '0' },
        { label: 'Total Storage', value: formatBytes(stats.total_storage_used || 0) },
      ];

      statCards.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'bg-gradient-to-br from-blue-50 to-indigo-50 rounded p-4 border border-blue-200';

        const label = document.createElement('div');
        label.className = 'text-sm font-medium text-gray-600 mb-1';
        label.textContent = stat.label;
        card.appendChild(label);

        const value = document.createElement('div');
        value.className = 'text-2xl font-bold text-gray-900';
        value.textContent = stat.value;
        card.appendChild(value);

        statsGrid.appendChild(card);
      });

      div.appendChild(statsGrid);
    })
    .catch((err) => {
      div.innerHTML = '';
      div.appendChild(
        Alert({
          type: 'error',
          message: `Failed to load statistics: ${err instanceof Error ? err.message : 'Unknown error'}`,
        }),
      );
    });

  return div;
}

function createInfoRow(label: string, value: string): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'flex justify-between items-start py-2 border-b border-gray-200';

  const labelEl = document.createElement('span');
  labelEl.className = 'font-medium text-gray-700';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'text-gray-600 break-all';
  valueEl.textContent = value;

  row.appendChild(labelEl);
  row.appendChild(valueEl);

  return row;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
