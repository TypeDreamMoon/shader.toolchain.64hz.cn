import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { Callout } from 'fumadocs-ui/components/callout';
import sourceLock from '@/docs-sync/source-lock.json';

type SourcePage = {
  hash: string; revision: string; locale: string; sources: { path: string }[];
  translation?: { status: 'current' | 'unreviewed' | 'outdated' | 'missing' };
};

/** Evaluated during the static build, including on a reviewed translation PR. */
export function TranslationNotice({ locale, slug }: { locale: string; slug?: string[] }) {
  if (locale !== 'zh') return null;
  const pages = sourceLock.pages as Record<string, SourcePage>;
  const name = slug?.join('/') || 'index';
  const id = pages[name] ? name : `${name}/index`;
  const page = pages[id];
  if (!page) return null;
  const recordPath = path.join(process.cwd(), 'docs-sync', 'translations', `${id}.json`);
  const record = existsSync(recordPath)
    ? JSON.parse(readFileSync(recordPath, 'utf8')) as { sourceHash: string }
    : undefined;
  const status = page.translation?.status ?? (record?.sourceHash === page.hash ? 'current' : record ? 'outdated' : 'unreviewed');
  if (status === 'current') return null;
  const original = page.locale === 'en'
    ? `/en/docs/${name === 'index' ? '' : name}`
    : `https://github.com/${sourceLock.repository}/blob/${page.revision}/${page.sources[0].path}`;
  return (
    <Callout type="warn" title={status === 'outdated' ? '原文已更新' : '本页待核对'}>
      {status === 'outdated' ? '本页中文尚未跟进最新原文。' : '本页中文尚未与当前插件文档完成核对。'}
      {' '}<a href={original}>查看原文</a>。翻译更新经插件仓库审阅合并后发布。
    </Callout>
  );
}
