import type MarkdownIt from 'markdown-it';
import { alert } from '@mdit/plugin-alert';
import { attrs } from '@mdit/plugin-attrs';
import { imgSize } from '@mdit/plugin-img-size';
import { katex } from '@mdit/plugin-katex';
import { mark } from '@mdit/plugin-mark';
import { spoiler } from '@mdit/plugin-spoiler';
import { tasklist } from '@mdit/plugin-tasklist';
import { usePreprocessor } from './preprocessor';
import { obsidianWikiLink } from './plugins/wikilink';
import { obsidianTags } from './plugins/tags';
import { obsidianEmbed } from './plugins/embed';

export interface ObsidianMarkdownOptions {
  linkmap?: Record<string, string | string[]>;
  basePath?: string;
}

export function useObsidianMarkdown(md: MarkdownIt, options: ObsidianMarkdownOptions = {}) {
  // 预处理（单次遍历，转换 embed 等）
  md.use(usePreprocessor, options);

  // 核心插件
  md.use(obsidianWikiLink, options);
  md.use(obsidianTags, options);
  md.use(obsidianEmbed, options);

  // 官方插件
  md.use(attrs);
  md.use(mark);
  md.use(tasklist);
  md.use(katex);
  md.use(spoiler);
  md.use(imgSize);
  md.use(alert);
}

export * from './utils/parseWikiLink';
export * from './utils/linkResolver';
export * from './preprocessor';
