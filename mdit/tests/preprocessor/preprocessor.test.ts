import { describe, expect, it } from 'vitest';
import { obsidianPreprocessor } from '../../src/preprocessor';

describe('obsidianPreprocessor', () => {
  it('converts image embed with width', () => {
    const input = '![[diagram.png|600]]';
    const output = obsidianPreprocessor(input, { basePath: '/attachments' });
    expect(output).toBe('![diagram.png|600x0](/attachments/diagram.png){.obsidian-embed}');
  });

  it('converts file embed to link', () => {
    const input = '![[doc.pdf]]';
    const output = obsidianPreprocessor(input, { basePath: '/attachments' });
    expect(output).toBe('[doc.pdf](/attachments/doc.pdf){.obsidian-embed-file}');
  });

  it('keeps wikilink untouched', () => {
    const input = 'See [[page]] for details';
    const output = obsidianPreprocessor(input, { basePath: '/attachments' });
    expect(output).toBe('See [[page]] for details');
  });

  it('encodes special characters in path', () => {
    const input = '![[C♯C++ Icon 1.png|800x400]]';
    const output = obsidianPreprocessor(input, { basePath: '/attachments' });
    expect(output).toContain('/attachments/C%E2%99%AFC%2B%2B%20Icon%201.png');
  });

  it('normalizes markdown image width', () => {
    const input = '![alt|600](url)';
    const output = obsidianPreprocessor(input, {});
    expect(output).toBe('![alt|600x0](url)');
  });
});
