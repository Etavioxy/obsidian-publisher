import { describe, expect, it } from 'vitest';
import { resolveLinkPath, findSimilarInLinkmap } from '../../src/utils/linkResolver';

describe('linkResolver', () => {
  describe('resolveLinkPath', () => {
    it('exact match single candidate', () => {
      const resolution = resolveLinkPath('page', {
        linkmap: { page: '/docs/page.md' },
      });
      expect(resolution.resolved).toBe('/docs/page.md');
      expect(resolution.isAmbiguous).toBe(false);
      expect(resolution.candidates).toEqual(['/docs/page.md']);
    });

    it('exact match with multiple candidates', () => {
      const resolution = resolveLinkPath('开发', {
        linkmap: {
          '开发': ['/Notes/开发.md', '/Notes/path2/开发.md'],
        },
      });
      expect(resolution.resolved).toBe('/Notes/开发.md'); // first one
      expect(resolution.isAmbiguous).toBe(true);
      expect(resolution.candidates).toEqual(['/Notes/开发.md', '/Notes/path2/开发.md']);
    });

    it('filename match when exact fails', () => {
      const resolution = resolveLinkPath('开发', {
        linkmap: {
          '开发': '/Notes/开发.md', // matched by filename
        },
      });
      expect(resolution.resolved).toBe('/Notes/开发.md');
      expect(resolution.isAmbiguous).toBe(false);
    });

    it('returns original path when no match', () => {
      const resolution = resolveLinkPath('unknown', {
        linkmap: { page: '/docs/page.md' },
      });
      expect(resolution.resolved).toBe('unknown');
      expect(resolution.candidates).toEqual([]);
      expect(resolution.isAmbiguous).toBe(false);
    });

    it('prefers exact path over filename', () => {
      const resolution = resolveLinkPath('Notes/开发', {
        linkmap: {
          'Notes/开发': '/docs/Notes/开发.md',
          '开发': ['/other/开发.md'],
        },
      });
      expect(resolution.resolved).toBe('/docs/Notes/开发.md');
    });
  });

  describe('findSimilarInLinkmap', () => {
    it('finds all candidates with same basename', () => {
      const linkmap = {
        '开发': ['/Notes/开发.md', '/Notes/path2/开发.md'],
        other: '/docs/other.md',
      };
      const similar = findSimilarInLinkmap('开发', linkmap);
      expect(similar).toContain('/Notes/开发.md');
      expect(similar).toContain('/Notes/path2/开发.md');
      expect(similar.length).toBe(2);
    });

    it('case-insensitive matching', () => {
      const linkmap = {
        'MyPage': '/docs/MyPage.md',
        'page': '/notes/page.md',
      };
      const similar = findSimilarInLinkmap('mypage', linkmap);
      expect(similar).toContain('/docs/MyPage.md');
    });

    it('handles extension in path', () => {
      const linkmap = {
        'page.md': '/docs/page.md',
      };
      const similar = findSimilarInLinkmap('page', linkmap);
      expect(similar).toContain('/docs/page.md');
    });
  });
});
