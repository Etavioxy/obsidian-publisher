import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const cssFiles = [
  'node_modules/@mdit/plugin-alert/alert.css',
  'node_modules/@mdit/plugin-spoiler/spoiler.css',
];

let combinedCss = '/* Combined CSS from mdit-obsidian plugins */\n\n';

for (const file of cssFiles) {
  const filePath = resolve(file);
  try {
    const content = readFileSync(filePath, 'utf-8');
    const fileName = file.split('/').pop();
    combinedCss += `/* From: ${file} */\n`;
    combinedCss += content;
    combinedCss += '\n\n';
    console.log(`✓ Included ${fileName}`);
  } catch (err) {
    console.warn(`⚠ Could not read ${file}: ${err.message}`);
  }
}

// Add KaTeX CSS reference
combinedCss += `/* KaTeX CSS - import from CDN */\n`;
combinedCss += `/* @import url('https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css'); */\n`;

const outputPath = resolve('dist/styles.css');
writeFileSync(outputPath, combinedCss, 'utf-8');
console.log(`✓ Combined CSS written to ${outputPath}`);
console.log(`\nCSS files included: ${cssFiles.length}`);
console.log('Note: KaTeX CSS should be imported from CDN in your HTML/template');
