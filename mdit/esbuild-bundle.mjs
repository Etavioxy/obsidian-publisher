import esbuild from 'esbuild';
import { execSync } from 'child_process';

// 只生成一个完整打包版本（所有依赖内置）
const config = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  packages: 'bundle',
  outfile: 'dist/index.mjs',
  format: 'esm',
  platform: 'neutral',
  target: 'es2020',
  splitting: false,
  sourcemap: false,
};

await esbuild.build(config);
console.log('✓ Built bundled index.mjs');

// Build combined CSS
try {
  execSync('node build-css.mjs', { stdio: 'inherit' });
} catch (err) {
  console.error('✗ Failed to build CSS:', err.message);
}



