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

  it('resolves wikilink with path using linkmap - prefers matching candidate', () => {
    // When user writes [[test/a]], and linkmap has "a": ["/a", "/test/a"]
    // It should resolve to /test/a (the matching candidate), not /a (first candidate)
    const md = new MarkdownIt();
    const linkmap = {
      'a': ['/a', '/test/a'],
      'b': ['/b', '/test/b'],
    };
    md.use(obsidianWikiLink, { linkmap, basePath: '/' });
    const html = md.render('[[test/a]]');
    expect(html).toContain('<a href="/test/a">test/a</a>');
  });

  it('resolves simple wikilink using first candidate from array', () => {
    // When user writes [[a]], and linkmap has "a": ["/a", "/test/a"]
    // It should resolve to /a (first candidate)
    const md = new MarkdownIt();
    const linkmap = {
      'a': ['/a', '/test/a'],
    };
    md.use(obsidianWikiLink, { linkmap, basePath: '/' });
    const html = md.render('[[a]]');
    expect(html).toContain('<a href="/a">a</a>');
  });
});
