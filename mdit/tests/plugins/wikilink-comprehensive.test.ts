import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { obsidianWikiLink } from '../../src/plugins/wikilink';

describe('obsidianWikiLink - comprehensive', () => {
  it('basic wikilink', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/docs' });
    const html = md.render('[[page]]');
    expect(html).toContain('<a href="/docs/page">page</a>');
  });

  it('wikilink with display text', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/docs' });
    const html = md.render('[[page|显示页面]]');
    expect(html).toContain('<a href="/docs/page">显示页面</a>');
  });

  it('wikilink with anchor only', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/docs' });
    const html = md.render('[[getting-started#installation]]');
    expect(html).toContain('<a href="/docs/getting-started#installation">getting-started</a>');
  });

  it('wikilink with anchor and display text', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/docs' });
    const html = md.render('[[getting-started#installation|安装指南]]');
    expect(html).toContain('<a href="/docs/getting-started#installation">安装指南</a>');
  });

  it('wikilink with nested path', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/docs' });
    const html = md.render('[[path/to/page]]');
    expect(html).toContain('<a href="/docs/path/to/page">path/to/page</a>');
  });

  it('wikilink with .md extension removed', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/docs' });
    const html = md.render('[[page.md|click]]');
    expect(html).toContain('<a href="/docs/page">click</a>');
  });

  it('wikilink with linkmap resolution', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, {
      basePath: '/docs',
      linkmap: { 'home': '/index' },
    });
    const html = md.render('[[home]]');
    expect(html).toContain('<a href="/index">home</a>');
  });

  it('wikilink with same-name ambiguity (takes first)', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, {
      basePath: '/docs',
      linkmap: { '开发': ['/Notes/开发.md', '/Notes/path2/开发.md'] },
    });
    const html = md.render('[[开发]]');
    expect(html).toContain('/Notes/%E5%BC%80%E5%8F%91.md'); // encoded
    expect(html).toContain('>开发</a>'); // display name not encoded
  });

  it('wikilink with chinese chars', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/docs' });
    const html = md.render('[[研究计划]]');
    expect(html).toContain('/docs/%E7%A0%94%E7%A9%B6'); // encoded path
    expect(html).toContain('>研究计划</a>'); // display name
  });

  it('wikilink with emoji', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/docs' });
    const html = md.render('[[C♯C++ 😆]]');
    expect(html).toContain('C%E2%99%AFC%2B%2B%20');
  });

  it('multiple wikilinks in one line', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/docs' });
    const html = md.render('See [[page1]] and [[page2]].', {});
    expect(html).toContain('<a href="/docs/page1">page1</a>');
    expect(html).toContain('<a href="/docs/page2">page2</a>');
  });
});
