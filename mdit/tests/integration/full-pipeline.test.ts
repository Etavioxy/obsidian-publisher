import MarkdownIt from 'markdown-it';
import { describe, expect, it } from 'vitest';
import { useObsidianMarkdown } from '../../src';

describe('taskLists - GFM style', () => {
  it('unchecked task list', () => {
    const md = new MarkdownIt();
    useObsidianMarkdown(md, { basePath: '/docs' });
    const html = md.render('- [ ] Task 1\n- [x] Task 2');
    expect(html).toContain('task-list-item');
    expect(html).toContain('<input type="checkbox"');
  });

  it('checked task list', () => {
    const md = new MarkdownIt();
    useObsidianMarkdown(md, { basePath: '/docs' });
    const html = md.render('- [x] Done task');
    expect(html).toContain('checked');
  });
});

describe('integration - full pipeline', () => {
  it('wikilink + embed + tags', () => {
    const md = new MarkdownIt();
    useObsidianMarkdown(md, {
      basePath: '/docs',
      linkmap: { home: '/index' },
    });

    const input = 'See [[home|display]] for details.\n\n![[image.png|600]]\n\nTags: #work #important';
    const html = md.render(input);
    
    expect(html).toContain('<a href="/index">display</a>'); // wikilink
    expect(html).toContain('obsidian-embed'); // embed image
    expect(html).toContain('data-tag="work"'); // tag
    expect(html).toContain('data-tag="important"'); // tag
  });
});
