import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { obsidianTags } from '../../src/plugins/tags';

describe('obsidianTags', () => {
  it('wraps hashtag into span', () => {
    const md = new MarkdownIt();
    md.use(obsidianTags);
    const html = md.render('hello #tag world');
    expect(html).toContain('<span class="obsidian-tag" data-tag="tag">#tag</span>');
  });
});
