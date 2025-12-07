// 快速验证 bundle 是否可正常导入和使用
import { useObsidianMarkdown, parseWikiLink, obsidianPreprocessor } from './dist/index.mjs';
import MarkdownIt from 'markdown-it';

console.log('✓ Successfully imported useObsidianMarkdown, parseWikiLink, obsidianPreprocessor');

// 测试 parseWikiLink
const info = parseWikiLink('image.png|600x400');
console.log('✓ parseWikiLink works:', info);

// 测试 preprocessor
const preprocessed = obsidianPreprocessor('![[diagram.svg|800]]', { basePath: '/assets' });
console.log('✓ preprocessor works:', preprocessed);

// 测试 useObsidianMarkdown
const md = new MarkdownIt();
useObsidianMarkdown(md, { basePath: '/docs' });
const html = md.render('[[page]] and ![[image.png|600]]');
console.log('✓ useObsidianMarkdown works');
console.log('  HTML output:', html.slice(0, 100) + '...');
