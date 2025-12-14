/**
 * Lightweight UI Components using UnoCSS utilities
 * No dependencies, pure functions generating DOM
 */

export interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

/**
 * Button Component
 */
export function Button(props: ButtonProps): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = props.type || 'button';
  btn.textContent = props.text;
  btn.disabled = props.disabled || false;
  btn.onclick = props.onClick;

  // Base styles
  const baseClasses =
    'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  // Variant styles
  let variantClasses = '';
  switch (props.variant || 'primary') {
    case 'primary':
      variantClasses = 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
      break;
    case 'secondary':
      variantClasses = 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400';
      break;
    case 'danger':
      variantClasses = 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
      break;
  }

  btn.className = `${baseClasses} ${variantClasses} ${props.className || ''}`;
  return btn;
}

export interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Input Component
 */
export function Input(props: InputProps): HTMLInputElement {
  const input = document.createElement('input');
  input.type = props.type || 'text';
  input.placeholder = props.placeholder || '';
  input.value = props.value || '';
  input.name = props.name || '';
  input.required = props.required || false;
  input.disabled = props.disabled || false;

  if (props.onChange) {
    input.addEventListener('input', (e) => {
      props.onChange?.((e.target as HTMLInputElement).value);
    });
  }

  const baseClasses =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500';
  input.className = `${baseClasses} ${props.className || ''}`;

  return input;
}

export interface FormGroupProps {
  label: string;
  children: HTMLElement;
  error?: string;
  className?: string;
}

/**
 * Form Group Component (Label + Input + Error)
 */
export function FormGroup(props: FormGroupProps): HTMLDivElement {
  const div = document.createElement('div');
  div.className = `mb-4 ${props.className || ''}`;

  const label = document.createElement('label');
  label.className = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  label.textContent = props.label;

  div.appendChild(label);
  div.appendChild(props.children);

  if (props.error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'mt-1 text-sm text-red-600';
    errorDiv.textContent = props.error;
    div.appendChild(errorDiv);
  }

  return div;
}

export interface AlertProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose?: () => void;
  className?: string;
}

/**
 * Alert Component
 */
export function Alert(props: AlertProps): HTMLDivElement {
  const div = document.createElement('div');

  const type = props.type || 'info';
  let bgColor = '';
  let textColor = '';
  let borderColor = '';

  switch (type) {
    case 'success':
      bgColor = 'bg-green-50';
      textColor = 'text-green-800';
      borderColor = 'border-green-200';
      break;
    case 'error':
      bgColor = 'bg-red-50';
      textColor = 'text-red-800';
      borderColor = 'border-red-200';
      break;
    case 'warning':
      bgColor = 'bg-yellow-50';
      textColor = 'text-yellow-800';
      borderColor = 'border-yellow-200';
      break;
    case 'info':
    default:
      bgColor = 'bg-blue-50';
      textColor = 'text-blue-800';
      borderColor = 'border-blue-200';
      break;
  }

  div.className = `p-4 rounded-md border ${bgColor} ${textColor} ${borderColor} ${props.className || ''}`;

  const content = document.createElement('div');
  content.className = 'flex justify-between items-start';

  const message = document.createElement('span');
  message.textContent = props.message;
  content.appendChild(message);

  if (props.onClose) {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'ml-2 text-current hover:opacity-70 font-bold';
    closeBtn.textContent = '×';
    closeBtn.onclick = props.onClose;
    content.appendChild(closeBtn);
  }

  div.appendChild(content);
  return div;
}

export interface CardProps {
  title: string;
  children: HTMLElement | HTMLElement[];
  className?: string;
}

/**
 * Card Component
 */
export function Card(props: CardProps): HTMLDivElement {
  const div = document.createElement('div');
  div.className = `bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${props.className || ''}`;

  const title = document.createElement('h2');
  title.className = 'text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100';
  title.textContent = props.title;
  div.appendChild(title);

  const childArray = Array.isArray(props.children) ? props.children : [props.children];
  childArray.forEach(child => div.appendChild(child));

  return div;
}

export interface LoadingSpinnerProps {
  className?: string;
}

/**
 * Loading Spinner Component
 */
export function LoadingSpinner(props?: LoadingSpinnerProps): HTMLDivElement {
  const div = document.createElement('div');
  div.className = `inline-block animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full ${props?.className || ''}`;
  return div;
}

export interface ThemeToggleProps {
  className?: string;
}

/**
 * Theme Toggle Button Component
 */
export function ThemeToggle(props?: ThemeToggleProps): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${props?.className || ''}`;
  button.setAttribute('aria-label', 'Toggle theme');
  
  // Icon container
  const iconSpan = document.createElement('span');
  iconSpan.className = 'block w-5 h-5';
  
  // Update icon based on current theme
  const updateIcon = (isDark: boolean) => {
    if (isDark) {
      // Moon icon (dark mode)
      iconSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`;
    } else {
      // Sun icon (light mode)
      iconSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>`;
    }
  };
  
  button.appendChild(iconSpan);
  
  return button;
}
