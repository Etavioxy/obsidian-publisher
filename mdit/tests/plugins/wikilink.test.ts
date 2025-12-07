import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { obsidianWikiLink } from '../../src/plugins/wikilink';

describe('obsidianWikiLink', () => {
  it('renders basic wikilink', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/attachments' });
    const html = md.render('[[page]]');
    expect(html).toContain('<a href="/attachments/page">page</a>');
  });

  it('renders display text and anchor', () => {
    const md = new MarkdownIt();
    md.use(obsidianWikiLink, { basePath: '/notes' });
    const html = md.render('[[path/to/page#sec|显示]]');
    expect(html).toContain('<a href="/notes/path/to/page#sec">显示</a>');
  });
});
