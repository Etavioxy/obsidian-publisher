import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss';

export default defineConfig({
  presets: [
    presetUno({ dark: 'class' }),
    presetAttributify(),
    presetIcons(),
  ],

  // Include .ts and .js files for extraction
  content: {
    pipeline: {
      include: [
        // Include TypeScript files in src directory
        'src/**/*.ts',
        'src/**/*.js',
      ],
    },
  },

  shortcuts: {
    'btn-primary': 'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
    'btn-secondary': 'px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400',
    'btn-danger': 'px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500',
  },
});
