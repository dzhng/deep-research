import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { __testing } from './search';

describe('search.extractContent', () => {
  it('prefers full text when available', () => {
    const out = __testing.extractContent({
      text: 'full body',
      highlights: ['h1', 'h2'],
      summary: 's',
    });
    assert.strictEqual(out, 'full body');
  });

  it('falls back to joined highlights when text is missing', () => {
    const out = __testing.extractContent({
      highlights: ['line one', 'line two'],
      summary: 's',
    });
    assert.strictEqual(out, 'line one\n\nline two');
  });

  it('treats whitespace-only text as missing', () => {
    const out = __testing.extractContent({
      text: '   \n  ',
      highlights: ['only highlight'],
    });
    assert.strictEqual(out, 'only highlight');
  });

  it('falls back to summary when text and highlights are missing', () => {
    const out = __testing.extractContent({ summary: 'short summary' });
    assert.strictEqual(out, 'short summary');
  });

  it('returns undefined when nothing is present', () => {
    assert.strictEqual(__testing.extractContent({}), undefined);
  });

  it('returns undefined when highlights array is empty', () => {
    assert.strictEqual(__testing.extractContent({ highlights: [] }), undefined);
  });
});

describe('search.parseList', () => {
  it('returns empty array for undefined or empty', () => {
    assert.deepStrictEqual(__testing.parseList(undefined), []);
    assert.deepStrictEqual(__testing.parseList(''), []);
  });

  it('splits on commas and trims whitespace', () => {
    assert.deepStrictEqual(
      __testing.parseList('arxiv.org, nature.com ,science.org'),
      ['arxiv.org', 'nature.com', 'science.org'],
    );
  });

  it('drops empty entries', () => {
    assert.deepStrictEqual(__testing.parseList('a,,b, ,c'), ['a', 'b', 'c']);
  });
});

describe('search.ExaProvider', () => {
  const originalKey = process.env.EXA_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.EXA_API_KEY;
    } else {
      process.env.EXA_API_KEY = originalKey;
    }
  });

  it('throws a clear error when EXA_API_KEY is unset', () => {
    delete process.env.EXA_API_KEY;
    assert.throws(() => new __testing.ExaProvider(), /EXA_API_KEY is required/);
  });

  it('parses the Exa response shape into url + markdown items', async () => {
    process.env.EXA_API_KEY = 'test-key';
    const provider = new __testing.ExaProvider();

    const fakeApiResult = {
      results: [
        {
          url: 'https://example.com/a',
          text: 'page A body',
          highlights: ['hA'],
          summary: 'sA',
        },
        {
          url: 'https://example.com/b',
          highlights: ['hB1', 'hB2'],
          summary: 'sB',
        },
        { url: 'https://example.com/c', summary: 'sC only' },
        { url: 'https://example.com/d' },
      ],
    };

    let capturedQuery: string | undefined;
    let capturedOptions: Record<string, unknown> | undefined;
    (provider as unknown as { client: { searchAndContents: unknown } }).client =
      {
        searchAndContents: async (q: string, opts: Record<string, unknown>) => {
          capturedQuery = q;
          capturedOptions = opts;
          return fakeApiResult;
        },
      };

    const response = await provider.search('quantum supremacy', { limit: 4 });

    assert.strictEqual(capturedQuery, 'quantum supremacy');
    assert.strictEqual(capturedOptions?.numResults, 4);
    assert.deepStrictEqual(response, {
      data: [
        { url: 'https://example.com/a', markdown: 'page A body' },
        { url: 'https://example.com/b', markdown: 'hB1\n\nhB2' },
        { url: 'https://example.com/c', markdown: 'sC only' },
        { url: 'https://example.com/d', markdown: undefined },
      ],
    });
  });

  it('forwards optional Exa filters from env vars', async () => {
    process.env.EXA_API_KEY = 'test-key';
    process.env.EXA_SEARCH_TYPE = 'neural';
    process.env.EXA_CATEGORY = 'research paper';
    process.env.EXA_INCLUDE_DOMAINS = 'arxiv.org, nature.com';
    process.env.EXA_EXCLUDE_DOMAINS = 'reddit.com';

    try {
      const provider = new __testing.ExaProvider();
      let capturedOptions: Record<string, unknown> | undefined;
      (
        provider as unknown as { client: { searchAndContents: unknown } }
      ).client = {
        searchAndContents: async (
          _q: string,
          opts: Record<string, unknown>,
        ) => {
          capturedOptions = opts;
          return { results: [] };
        },
      };

      await provider.search('test', {});

      assert.strictEqual(capturedOptions?.type, 'neural');
      assert.strictEqual(capturedOptions?.category, 'research paper');
      assert.deepStrictEqual(capturedOptions?.includeDomains, [
        'arxiv.org',
        'nature.com',
      ]);
      assert.deepStrictEqual(capturedOptions?.excludeDomains, ['reddit.com']);
    } finally {
      delete process.env.EXA_SEARCH_TYPE;
      delete process.env.EXA_CATEGORY;
      delete process.env.EXA_INCLUDE_DOMAINS;
      delete process.env.EXA_EXCLUDE_DOMAINS;
    }
  });

  it('attaches the x-exa-integration header for usage attribution', () => {
    process.env.EXA_API_KEY = 'test-key';
    const provider = new __testing.ExaProvider();
    const headers = (
      provider as unknown as { client: { headers: Record<string, string> } }
    ).client.headers;
    assert.strictEqual(headers['x-exa-integration'], 'deep-research');
  });
});

describe('search.getProvider', () => {
  const originalProvider = process.env.SEARCH_PROVIDER;

  beforeEach(() => {
    __testing.reset();
  });

  afterEach(() => {
    __testing.reset();
    if (originalProvider === undefined) {
      delete process.env.SEARCH_PROVIDER;
    } else {
      process.env.SEARCH_PROVIDER = originalProvider;
    }
  });

  it('rejects unknown SEARCH_PROVIDER values', async () => {
    process.env.SEARCH_PROVIDER = 'bogus';
    const { search } = await import('./search');
    assert.throws(() => search('q'), /Unknown SEARCH_PROVIDER "bogus"/);
  });
});
