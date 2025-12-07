import esbuild from 'esbuild';

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



