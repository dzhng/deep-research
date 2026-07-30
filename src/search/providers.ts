import FirecrawlApp from '@mendable/firecrawl-js';

export type SearchResult = {
  url?: string;
  markdown?: string;
};

export type SearchResponse = {
  data: SearchResult[];
};

export type SearchOptions = {
  limit: number;
  timeout: number;
};

export interface SearchProvider {
  search(query: string, options: SearchOptions): Promise<SearchResponse>;
}

class FirecrawlProvider implements SearchProvider {
  private app = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_KEY ?? '',
    apiUrl: process.env.FIRECRAWL_BASE_URL,
  });

  async search(query: string, { limit, timeout }: SearchOptions): Promise<SearchResponse> {
    const result = await this.app.search(query, {
      timeout,
      limit,
      scrapeOptions: { formats: ['markdown'] },
    });
    return { data: result.data.map(item => ({ url: item.url, markdown: item.markdown })) };
  }
}

type ExaSearchResult = {
  url?: string;
  text?: string;
};

class ExaProvider implements SearchProvider {
  private apiKey = process.env.EXA_API_KEY ?? '';
  private baseUrl = process.env.EXA_BASE_URL ?? 'https://api.exa.ai';

  async search(query: string, { limit, timeout }: SearchOptions): Promise<SearchResponse> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'x-exa-integration': 'dzhng/deep-research-integration',
      },
      body: JSON.stringify({
        query,
        type: 'auto',
        numResults: limit,
        contents: {
          text: { maxCharacters: 25_000 },
          maxAgeHours: Number(process.env.EXA_MAX_AGE_HOURS) || undefined,
        },
      }),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`Exa search failed (${response.status}): ${await response.text()}`);
    }

    const body = (await response.json()) as { results?: ExaSearchResult[] };
    return {
      data: (body.results ?? []).map(result => ({
        url: result.url,
        markdown: result.text,
      })),
    };
  }
}

const providers: Record<string, () => SearchProvider> = {
  firecrawl: () => new FirecrawlProvider(),
  exa: () => new ExaProvider(),
};

export function getSearchProvider(): SearchProvider {
  const name =
    process.env.SEARCH_PROVIDER ??
    (process.env.EXA_API_KEY && !process.env.FIRECRAWL_KEY ? 'exa' : 'firecrawl');
  const provider = providers[name];
  if (!provider) {
    throw new Error(
      `Unknown SEARCH_PROVIDER "${name}", expected one of: ${Object.keys(providers).join(', ')}`,
    );
  }
  return provider();
}
