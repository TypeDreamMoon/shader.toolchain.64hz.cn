import { source } from '@/lib/source';
import { createTokenizer } from '@orama/tokenizers/mandarin';
import { createFromSource } from 'fumadocs-core/search/server';

export const revalidate = false;

export const { staticGET: GET } = createFromSource(source, {
  localeMap: {
    zh: {
      components: {
        tokenizer: createTokenizer(),
      },
    },
    en: 'english',
  },
  search: {
    threshold: 0,
    tolerance: 0,
  },
});
