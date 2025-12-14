/**
 * 404 Not Found View
 */

import { router } from '../router';
import { Button, Card } from '../ui/components';

export function create404View(): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4';

  const card = Card({
    title: '404 - Page Not Found',
    children: create404Content(),
    className: 'w-full max-w-md text-center',
  });

  container.appendChild(card);
  return container;
}

function create404Content(): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'space-y-4';

  const message = document.createElement('p');
  message.className = 'text-gray-600';
  message.textContent = 'The page you are looking for does not exist.';
  div.appendChild(message);

  const homeBtn = Button({
    text: 'Go Home',
    variant: 'primary',
    onClick: () => router.navigate('me'),
  });

  div.appendChild(homeBtn);

  return div;
}
