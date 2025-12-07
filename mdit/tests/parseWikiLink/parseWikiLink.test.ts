import { describe, expect, it } from 'vitest';
import { parseWikiLink } from '../../src/utils/parseWikiLink';

describe('parseWikiLink', () => {
  it('parses basic page', () => {
    const info = parseWikiLink('page');
    expect(info.path).toBe('page');
    expect(info.display).toBe('page');
    expect(info.anchor).toBeUndefined();
    expect(info.size).toBeUndefined();
  });

  it('handles display text', () => {
    const info = parseWikiLink('path/to/page|显示');
    expect(info.path).toBe('path/to/page');
    expect(info.display).toBe('显示');
  });

  it('handles anchor', () => {
    const info = parseWikiLink('page#sec');
    expect(info.path).toBe('page');
    expect(info.anchor).toBe('sec');
  });

  it('removes md extension', () => {
    const info = parseWikiLink('note.md|展示');
    expect(info.path).toBe('note');
    expect(info.display).toBe('展示');
  });

  it('supports emoji and symbols', () => {
    const info = parseWikiLink('C♯C++ 😆|😀');
    expect(info.path).toBe('C♯C++ 😆');
    expect(info.display).toBe('😀');
  });

  it('captures size from display', () => {
    const info = parseWikiLink('image.png|600x400');
    expect(info.path).toBe('image.png');
    expect(info.size).toBe('600x400');
  });

  it('captures width-only size', () => {
    const info = parseWikiLink('image.png|600');
    expect(info.size).toBe('600');
  });
});
