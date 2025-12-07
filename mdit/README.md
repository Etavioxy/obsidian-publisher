# mdit-obsidian

Obsidian-style markdown-it plugins bundle with unified wikilink parser, single-pass preprocessor, embed handling, and tag support.

## Features

- **parseWikiLink**: Unified parser for `[[path|display#anchor|size]]` syntax
  - Supports emoji, Chinese, special chars, spaces
  - Extracts size (600, 600x400), display text, anchor fragments
  - Strips `.md` extension automatically

- **Preprocessor**: Single-pass transformation of Obsidian syntax to standard Markdown
  - `![[image.png|600]]` → `![image.png|600x0](/path){.obsidian-embed}`
  - `![[doc.pdf]]` → `[doc.pdf](/path){.obsidian-embed-file}`
  - Preserves `[[wikilink]]` for plugin handling
  - Encodes paths with special characters
  - Normalizes image widths to `widthx0` format

- **WikiLink Plugin**: Inline rule generating `<a href>` tokens
  - Resolves against linkmap
  - Supports anchors and display text
  - Handles same-name files

- **Tags Plugin**: Converts `#tag` to `<span class="obsidian-tag" data-tag="tag">`

- **Embed Plugin**: Preserves file embed classes (preprocessor does the heavy lifting)

- **Official Plugins**:
  - @mdit/plugin-attrs
  - @mdit/plugin-mark
  - @mdit/plugin-tasklist
  - @mdit/plugin-katex
  - @mdit/plugin-spoiler
  - @mdit/plugin-img-size
  - @mdit/plugin-alert

## Installation

```bash
pnpm add mdit-obsidian
```

## Usage

```typescript
import MarkdownIt from 'markdown-it';
import { useObsidianMarkdown } from 'mdit-obsidian';

const md = new MarkdownIt();
useObsidianMarkdown(md, {
  linkmap: {
    'page': '/docs/page.md',
    '开发': ['/notes/dev.md', '/notes/dev2.md'] // first wins
  },
  basePath: '/attachments'
});

// Now render Obsidian-style markdown
const html = md.render(`
# My Doc

See [[page|显示页面]] for more.

![Embedded image:](/attachments/diagram.png){.obsidian-embed}

![[image.png|600]]
![[doc.pdf]]

Tags: #work #中文tag
`);
```

## API

### parseWikiLink(raw: string): WikiLinkInfo
```typescript
interface WikiLinkInfo {
  path: string;       // normalized path (no .md, no display/anchor)
  display: string;    // display text (fallback to path)
  anchor?: string;    // fragment identifier
  size?: string;      // "600" or "600x400" if display is purely numeric
}

const info = parseWikiLink('C♯C++ 😆|600x400');
// { path: 'C♯C++ 😆', display: 'C♯C++ 😆', size: '600x400' }
```

### obsidianPreprocessor(text: string, options?: PreprocessorOptions): string
Transforms `![[...]]` embeds and `![...|width]` images in one pass.

### useObsidianMarkdown(md: MarkdownIt, options?: ObsidianMarkdownOptions)
Main entry point. Configures markdown-it with all plugins.

```typescript
interface ObsidianMarkdownOptions {
  linkmap?: Record<string, string | string[]>;
  basePath?: string; // default: '/attachments'
}
```

## Testing

```bash
pnpm test
```

All tests (parseWikiLink, preprocessor, plugins, integration) pass.

## Building

```bash
pnpm build
```

Generates:
- `dist/index.mjs` (ESM)
- `dist/index.js` (CJS)
- `dist/index.d.ts` / `dist/index.d.mts` (TypeScript declarations)

## Verification

```bash
node verify-build.mjs
```

Quickly tests that all exports work correctly.

## Integration with obsidian-publisher

The `mdit-obsidian` bundle can be integrated into the main CLI/publisher pipeline:

1. **In `cli/src/siteconfig/config.js`**: Replace current obsidian plugins with:
   ```javascript
   import { useObsidianMarkdown } from 'mdit-obsidian';
   md.use(useObsidianMarkdown, { linkmap, basePath: '/attachments' });
   ```

2. **In `publisher/src/ui/`**: Import markdown-it with mdit-obsidian

3. **In VitePress config**: Use mdit-obsidian as a markdown preset

See `../cli/src/siteconfig/plugin-obsidian.js` for legacy implementation reference.
