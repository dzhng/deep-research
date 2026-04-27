import FirecrawlApp from '@mendable/firecrawl-js';
import Exa from 'exa-js';

export type SearchItem = {
  url?: string;
  markdown?: string;
};

export type SearchResponse = {
  data: SearchItem[];
};

export type SearchOptions = {
  timeout?: number;
  limit?: number;
};

export interface SearchProvider {
  search(query: string, options: SearchOptions): Promise<SearchResponse>;
}

class FirecrawlProvider implements SearchProvider {
  private client: FirecrawlApp;

  constructor() {
    this.client = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_KEY ?? '',
      apiUrl: process.env.FIRECRAWL_BASE_URL,
    });
  }

  async search(query: string, options: SearchOptions): Promise<SearchResponse> {
    const result = await this.client.search(query, {
      timeout: options.timeout,
      limit: options.limit,
      scrapeOptions: { formats: ['markdown'] },
    });
    return {
      data: result.data.map(item => ({
        url: item.url,
        markdown: item.markdown,
      })),
    };
  }
}

const ExaCategories = [
  'company',
  'research paper',
  'news',
  'pdf',
  'personal site',
  'financial report',
  'people',
] as const;
type ExaCategory = (typeof ExaCategories)[number];

const ExaSearchTypes = [
  'auto',
  'neural',
  'fast',
  'deep',
  'deep-lite',
  'deep-reasoning',
  'instant',
] as const;
type ExaSearchType = (typeof ExaSearchTypes)[number];

class ExaProvider implements SearchProvider {
  private client: Exa;

  constructor() {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      throw new Error(
        'EXA_API_KEY is required when SEARCH_PROVIDER=exa. Get one at https://exa.ai',
      );
    }
    this.client = new Exa(apiKey);
    // Tag requests so Exa can attribute usage to this integration.
    (this.client as unknown as { headers: Record<string, string> }).headers[
      'x-exa-integration'
    ] = 'deep-research';
  }

  async search(query: string, options: SearchOptions): Promise<SearchResponse> {
    const numResults = options.limit ?? 5;
    const type = (process.env.EXA_SEARCH_TYPE ?? 'auto') as ExaSearchType;
    const category = process.env.EXA_CATEGORY as ExaCategory | undefined;
    const includeDomains = parseList(process.env.EXA_INCLUDE_DOMAINS);
    const excludeDomains = parseList(process.env.EXA_EXCLUDE_DOMAINS);

    const result = await this.client.searchAndContents(query, {
      numResults,
      type,
      text: { maxCharacters: 25_000 },
      highlights: { numSentences: 3, highlightsPerUrl: 3, query },
      summary: { query },
      ...(category && { category }),
      ...(includeDomains.length && { includeDomains }),
      ...(excludeDomains.length && { excludeDomains }),
      ...(process.env.EXA_START_PUBLISHED_DATE && {
        startPublishedDate: process.env.EXA_START_PUBLISHED_DATE,
      }),
      ...(process.env.EXA_END_PUBLISHED_DATE && {
        endPublishedDate: process.env.EXA_END_PUBLISHED_DATE,
      }),
    });

    return {
      data: result.results.map(r => ({
        url: r.url,
        markdown: extractContent(r),
      })),
    };
  }
}

// Cascade through Exa's content fields. Any combination may be present —
// prefer full text, then joined highlights, then the summary as a last resort.
function extractContent(result: {
  text?: string;
  highlights?: string[];
  summary?: string;
}): string | undefined {
  if (result.text && result.text.trim().length > 0) {
    return result.text;
  }
  if (Array.isArray(result.highlights) && result.highlights.length > 0) {
    return result.highlights.join('\n\n');
  }
  if (result.summary && result.summary.trim().length > 0) {
    return result.summary;
  }
  return undefined;
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

let cachedProvider: SearchProvider | undefined;

function getProvider(): SearchProvider {
  if (cachedProvider) return cachedProvider;
  const name = (process.env.SEARCH_PROVIDER ?? 'firecrawl').toLowerCase();
  switch (name) {
    case 'exa':
      cachedProvider = new ExaProvider();
      break;
    case 'firecrawl':
      cachedProvider = new FirecrawlProvider();
      break;
    default:
      throw new Error(
        `Unknown SEARCH_PROVIDER "${name}". Supported: firecrawl, exa`,
      );
  }
  return cachedProvider;
}

export function search(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  return getProvider().search(query, options);
}

// Exposed for tests.
export const __testing = {
  ExaProvider,
  FirecrawlProvider,
  extractContent,
  parseList,
  reset: () => {
    cachedProvider = undefined;
  },
};
