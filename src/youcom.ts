import type { SearchResponse } from '@mendable/firecrawl-js';

// You.com search + contents provider.
// Returns SearchResponse-compatible objects so it can drop into the same
// code paths as the Firecrawl backend in deep-research.ts.
//
// MINIMAL: ceiling — only fetches `markdown` format (the only format the
// existing deep-research pipeline consumes). If html/metadata are needed
// later, extend the `formats` array in fetchContents and surface the fields.

const SEARCH_ENDPOINT = 'https://ydc-index.io/v1/search';
const CONTENTS_ENDPOINT = 'https://ydc-index.io/v1/contents';

export type YoucomSearchOptions = {
  /** Max number of search results to return. */
  limit?: number;
  /** Per-request timeout in milliseconds. */
  timeout?: number;
};

type SearchHit = {
  url: string;
  title?: string;
  description?: string;
  snippets?: string[];
};

type ContentsEntry = {
  url: string;
  title?: string;
  markdown?: string | null;
};

async function fetchJson(
  url: string,
  apiKey: string,
  init: { method?: 'GET' | 'POST'; body?: unknown; timeoutMs: number },
) {
  const { method = 'POST', body, timeoutMs } = init;
  const res = await fetch(url, {
    method,
    headers: {
      'X-API-Key': apiKey,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `You.com request to ${url} failed (${res.status}): ${text}`,
    );
  }
  return res.json();
}

// Search the web via You.com, then fetch markdown content for each result URL
// via the Contents API. Falls back to search snippets when contents returns
// no markdown for a given URL.
export async function search(
  query: string,
  options: YoucomSearchOptions = {},
): Promise<SearchResponse> {
  const apiKey = process.env.YDC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'YDC_API_KEY environment variable is required for You.com search',
    );
  }

  const maxResults = options.limit ?? 5;
  const timeout = options.timeout ?? 15000;

  const searchUrl = new URL(SEARCH_ENDPOINT);
  searchUrl.searchParams.set('query', query);
  searchUrl.searchParams.set('count', String(maxResults));

  const searchData = await fetchJson(searchUrl.toString(), apiKey, {
    method: 'GET',
    timeoutMs: timeout,
  });

  const hits: SearchHit[] = searchData?.results?.web ?? [];
  const urls = hits
    .map(h => h.url)
    .filter((u): u is string => typeof u === 'string' && u.length > 0);

  if (urls.length === 0) {
    return { success: true, data: [] } as SearchResponse;
  }

  const contentsData = (await fetchJson(CONTENTS_ENDPOINT, apiKey, {
    body: {
      urls,
      formats: ['markdown'],
      crawl_timeout: Math.max(1, Math.min(60, Math.ceil(timeout / 1000))),
    },
    timeoutMs: timeout * urls.length,
  })) as ContentsEntry[];

  const markdownByUrl = new Map<string, string>();
  for (const c of contentsData) {
    if (c.url && c.markdown) {
      markdownByUrl.set(c.url, c.markdown);
    }
  }

  const data = hits.map(hit => ({
    url: hit.url,
    title: hit.title ?? '',
    description: hit.description ?? '',
    markdown: markdownByUrl.get(hit.url) ?? hit.snippets?.join('\n') ?? '',
  }));

  return { success: true, data } as SearchResponse;
}
