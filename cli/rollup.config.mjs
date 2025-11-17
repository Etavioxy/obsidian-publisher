import { builtinModules } from 'module';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import esbuild from 'rollup-plugin-esbuild';
import copy from 'rollup-plugin-copy';

const config = {
  input: 'src/index.ts',
  external: (id) => {
    // keep VitePress external (as requested)
    if (id === 'vitepress' || id.startsWith('vitepress/')) return true;
    // Node builtin modules should be external
    if (builtinModules.includes(id) || id.startsWith('node:')) return true;
    return false;
  },
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    esbuild({
      target: 'node18',
      platform: 'node',
      tsconfig: 'tsconfig.json'
    }),
    copy({
      targets: [
        { 
          src: 'src/siteconfig/**/*', 
          dest: 'dist/siteconfig' 
        }
      ],
      hook: 'writeBundle'
    })
  ],
  output: {
    file: 'dist/index.js',
    format: 'es',
    sourcemap: true
  }
};

export default config;
