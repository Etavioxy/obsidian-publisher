import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { obsidianTags } from '../../src/plugins/tags';

describe('obsidianTags - comprehensive', () => {
  it('simple tag', () => {
    const md = new MarkdownIt();
    md.use(obsidianTags);
    const html = md.render('#tag');
    expect(html).toContain('class="obsidian-tag"');
    expect(html).toContain('data-tag="tag"');
    expect(html).toContain('#tag');
  });

  it('tag with chinese chars', () => {
    const md = new MarkdownIt();
    md.use(obsidianTags);
    const html = md.render('#中文标签');
    expect(html).toContain('data-tag="中文标签"');
    expect(html).toContain('#中文标签');
  });

  it('tag with hyphen', () => {
    const md = new MarkdownIt();
    md.use(obsidianTags);
    const html = md.render('#my-tag');
    expect(html).toContain('data-tag="my-tag"');
  });

  it('tag with underscore', () => {
    const md = new MarkdownIt();
    md.use(obsidianTags);
    const html = md.render('#my_tag');
    expect(html).toContain('data-tag="my_tag"');
  });

  it('nested tag path', () => {
    const md = new MarkdownIt();
    md.use(obsidianTags);
    const html = md.render('#category/subcategory');
    expect(html).toContain('data-tag="category/subcategory"');
  });

  it('multiple tags in one line', () => {
    const md = new MarkdownIt();
    md.use(obsidianTags);
    const html = md.render('#tag1 #tag2 #中文标签');
    expect(html).toContain('data-tag="tag1"');
    expect(html).toContain('data-tag="tag2"');
    expect(html).toContain('data-tag="中文标签"');
  });

  it('tag must have space before it', () => {
    const md = new MarkdownIt();
    md.use(obsidianTags);
    const html = md.render('text#notag more text');
    // 不应该识别 #notag 作为标签
    expect(html).not.toContain('data-tag="notag"');
  });

  it('tag at line start', () => {
    const md = new MarkdownIt();
    md.use(obsidianTags);
    const html = md.render('#starttag hello');
    expect(html).toContain('data-tag="starttag"');
  });

  it('tag at line end', () => {
    const md = new MarkdownIt();
    md.use(obsidianTags);
    const html = md.render('hello world #endtag');
    expect(html).toContain('data-tag="endtag"');
  });
});
