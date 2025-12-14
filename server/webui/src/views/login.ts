// @unocss-include
/**
 * Login View
 */

import { authAPI, ApiError } from '../api';
import { authStore } from '../state/auth';
import { router } from '../router';
import { Button, Input, FormGroup, Alert, Card, LoadingSpinner } from '../ui/components';

export function createLoginView(): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4';

  const card = Card({
    title: 'Login',
    children: createLoginForm(),
    className: 'w-full max-w-md',
  });

  container.appendChild(card);
  return container;
}

function createLoginForm(): HTMLFormElement {
  const form = document.createElement('form');
  form.className = 'space-y-4';

  let usernameValue = '';
  let passwordValue = '';
  let isLoading = false;
  let errorMessage: string | null = null;

  // Error alert
  const errorAlert = document.createElement('div');
  errorAlert.id = 'error-alert';
  errorAlert.className = 'hidden';

  // Username field
  const usernameInput = Input({
    type: 'text',
    placeholder: 'Username',
    name: 'username',
    required: true,
    onChange: (value) => {
      usernameValue = value;
    },
  });

  const usernameGroup = FormGroup({
    label: 'Username',
    children: usernameInput,
  });

  // Password field
  const passwordInput = Input({
    type: 'password',
    placeholder: 'Password',
    name: 'password',
    required: true,
    onChange: (value) => {
      passwordValue = value;
    },
  });

  const passwordGroup = FormGroup({
    label: 'Password',
    children: passwordInput,
  });

  // Submit button
  const submitBtn = Button({
    text: 'Login',
    type: 'submit',
    onClick: () => {}, // Form submission handled by form submit event
  });

  // Form submission handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isLoading) return;
    isLoading = true;
    errorMessage = null;
    errorAlert.classList.add('hidden');

    try {
      submitBtn.disabled = true;

      if (!usernameValue.trim() || !passwordValue.trim()) {
        throw new Error('Username and password are required');
      }

      const response = await authAPI.login(usernameValue, passwordValue);
      authStore.setAuth(response);

      // Navigate to /me
      router.navigate('me');
    } catch (err) {
      isLoading = false;
      submitBtn.disabled = false;

      if (err instanceof ApiError) {
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = 'Login failed. Please try again.';
      }

      // Show error alert
      errorAlert.classList.remove('hidden');
      errorAlert.innerHTML = '';
      errorAlert.appendChild(
        Alert({
          type: 'error',
          message: errorMessage,
          onClose: () => {
            errorAlert.classList.add('hidden');
          },
        }),
      );
    }
  });

  form.appendChild(errorAlert);
  form.appendChild(usernameGroup);
  form.appendChild(passwordGroup);

  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex gap-2 pt-2';

  const registerLink = document.createElement('button');
  registerLink.type = 'button';
  registerLink.className = 'flex-1';
  registerLink.onclick = () => router.navigate('register');
  registerLink.appendChild(
    Button({
      text: 'Register',
      variant: 'secondary',
      onClick: () => {},
    }),
  );

  buttonContainer.appendChild(submitBtn);
  buttonContainer.appendChild(registerLink);

  form.appendChild(buttonContainer);

  return form;
}
