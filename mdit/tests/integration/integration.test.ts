import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { useObsidianMarkdown } from '../../src';

describe('integration', () => {
  it('pipeline renders embed and wikilink', () => {
    const md = new MarkdownIt();
    useObsidianMarkdown(md, { basePath: '/attachments' });

    const input = '![[image.png|600]] and [[doc]]';
    const html = md.render(input);

    expect(html).toContain('class="obsidian-embed"');
    expect(html).toContain('<img');
    expect(html).toContain('<a href="/attachments/doc"');
  });
});
