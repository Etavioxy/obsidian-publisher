/**
 * Register View
 */

import { authAPI, ApiError } from '../api';
import { authStore } from '../state/auth';
import { router } from '../router';
import { Button, Input, FormGroup, Alert, Card } from '../ui/components';

export function createRegisterView(): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4';

  const card = Card({
    title: 'Register',
    children: createRegisterForm(),
    className: 'w-full max-w-md',
  });

  container.appendChild(card);
  return container;
}

function createRegisterForm(): HTMLFormElement {
  const form = document.createElement('form');
  form.className = 'space-y-4';

  let usernameValue = '';
  let passwordValue = '';
  let confirmPasswordValue = '';
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

  // Confirm Password field
  const confirmPasswordInput = Input({
    type: 'password',
    placeholder: 'Confirm Password',
    name: 'confirmPassword',
    required: true,
    onChange: (value) => {
      confirmPasswordValue = value;
    },
  });

  const confirmPasswordGroup = FormGroup({
    label: 'Confirm Password',
    children: confirmPasswordInput,
  });

  // Submit button
  const submitBtn = Button({
    text: 'Register',
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

      // Validation
      if (!usernameValue.trim() || !passwordValue.trim()) {
        throw new Error('Username and password are required');
      }

      if (passwordValue !== confirmPasswordValue) {
        throw new Error('Passwords do not match');
      }

      if (passwordValue.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const response = await authAPI.register(usernameValue, passwordValue);
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
        errorMessage = 'Registration failed. Please try again.';
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
  form.appendChild(confirmPasswordGroup);

  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex gap-2 pt-2';

  const loginLink = document.createElement('button');
  loginLink.type = 'button';
  loginLink.className = 'flex-1';
  loginLink.onclick = () => router.navigate('login');
  loginLink.appendChild(
    Button({
      text: 'Back to Login',
      variant: 'secondary',
      onClick: () => {},
    }),
  );

  buttonContainer.appendChild(submitBtn);
  buttonContainer.appendChild(loginLink);

  form.appendChild(buttonContainer);

  return form;
}
