import { builtinModules } from 'module';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import esbuild from 'rollup-plugin-esbuild';
import copy from 'rollup-plugin-copy';
import dts from 'rollup-plugin-dts';

const external = (id) => {
  //if (id === 'archiver' || id.startsWith('archiver/')) return true;
  //if (id === 'fs-extra' || id.startsWith('fs-extra/')) return true;
  //if (id === 'tar' || id.startsWith('tar/')) return true;
  // Node builtin modules should be external
  if (builtinModules.includes(id) || id.startsWith('node:')) return true;
  return false;
};

const plugins = [
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
];

const configs = [
  // Main CLI entry point - CJS
  {
    input: 'src/index.ts',
    external,
    plugins,
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true
    }
  },
  // Lib entry point - ESM (for use in Obsidian plugin)
  {
    input: 'src/lib.ts',
    external,
    plugins,
    output: {
      file: 'dist/lib.mjs',
      format: 'es',
      sourcemap: true
    }
  }
];

// Add type declaration configurations
const typeConfigs = [
  {
    input: 'src/index.ts',
    plugins: [dts()],
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    }
  },
  {
    input: 'src/lib.ts',
    plugins: [dts()],
    output: {
      file: 'dist/lib.d.ts',
      format: 'es'
    }
  }
];

export default [...configs, ...typeConfigs];
