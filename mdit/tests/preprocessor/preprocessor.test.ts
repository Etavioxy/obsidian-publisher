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

  it('resolves embed image using linkmap - strips extension for lookup', () => {
    // When user writes ![[photo.png]]
    // and linkmap has key without extension "photo": "/gallery/photo.png"
    // It should resolve to the correct path by stripping .png extension from the filename
    const input = '![[photo.png]]';
    const linkmap = {
      'photo': '/gallery/photo.png',
    };
    const output = obsidianPreprocessor(input, { basePath: '/', linkmap });
    expect(output).toContain('/gallery/photo.png');
    expect(output).toContain('{.obsidian-embed}');
  });

  it('resolves embed using linkmap with exact path match first', () => {
    // When user writes ![[image.png]] with nested path
    // and linkmap has direct match for filename without extension
    const input = '![[photo.jpg]]';
    const linkmap = {
      'photo': '/gallery/photos/photo.jpg',
    };
    const output = obsidianPreprocessor(input, { basePath: '/', linkmap });
    expect(output).toContain('/gallery/photos/photo.jpg');
  });
});
