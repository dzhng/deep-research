import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { search } from './youcom';

// Tests mock globalThis.fetch — no real network calls are made.
// MINIMAL: ceiling — only covers the search→contents→mapping happy path,
// missing-key error, and non-200 error handling. Upgrade path: add tests
// for crawl_timeout propagation and partial-content edge cases if needed.
describe('youcom search', () => {
  const originalFetch = globalThis.fetch;
  let calls: { url: string; init: any }[] = [];

  beforeEach(() => {
    calls = [];
    process.env.YDC_API_KEY = 'test-key';
    globalThis.fetch = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      const u = String(url);
      if (u.includes('/v1/search')) {
        return new Response(
          JSON.stringify({
            results: {
              web: [
                {
                  url: 'https://a.example',
                  title: 'A',
                  description: 'desc A',
                  snippets: ['snippet A1', 'snippet A2'],
                },
                {
                  url: 'https://b.example',
                  title: 'B',
                  description: 'desc B',
                  snippets: ['snippet B'],
                },
              ],
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (u.includes('/v1/contents')) {
        return new Response(
          JSON.stringify([
            { url: 'https://a.example', title: 'A', markdown: '# A content' },
          ]),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('not found', { status: 404 });
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls search (GET with query+count) then contents (POST) and maps markdown with snippet fallback', async () => {
    const res = await search('hello', { limit: 2, timeout: 15000 });

    assert.equal(res.success, true);
    assert.equal(res.data.length, 2);
    assert.equal(res.data[0]!.url, 'https://a.example');
    assert.equal(res.data[0]!.markdown, '# A content');
    // second hit had no contents markdown → falls back to joined snippets
    assert.equal(res.data[1]!.markdown, 'snippet B');

    const searchCall = calls.find(c => c.url.includes('/v1/search'));
    assert.ok(searchCall, 'search endpoint was called');
    assert.equal(searchCall!.init.method, 'GET');
    const searchParams = new URL(searchCall!.url).searchParams;
    assert.equal(searchParams.get('query'), 'hello');
    assert.equal(searchParams.get('count'), '2');

    const contentsCall = calls.find(c => c.url.includes('/v1/contents'));
    assert.ok(contentsCall, 'contents endpoint was called');
    assert.equal(contentsCall!.init.method, 'POST');
    const contentsBody = JSON.parse(contentsCall!.init.body);
    assert.deepEqual(contentsBody.urls, [
      'https://a.example',
      'https://b.example',
    ]);
    assert.deepEqual(contentsBody.formats, ['markdown']);
  });

  it('returns empty data when search has no web results', async () => {
    globalThis.fetch = (async (url: any) => {
      const u = String(url);
      if (u.includes('/v1/search')) {
        return new Response(JSON.stringify({ results: {} }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('[]', { status: 200 });
    }) as typeof globalThis.fetch;

    const res = await search('empty');
    assert.equal(res.success, true);
    assert.equal(res.data.length, 0);
  });

  it('throws if YDC_API_KEY is missing', async () => {
    delete process.env.YDC_API_KEY;
    await assert.rejects(() => search('hello'), /YDC_API_KEY/);
  });

  it('throws on non-200 search response', async () => {
    globalThis.fetch = (async () =>
      new Response('{"detail":"Invalid or expired API key"}', {
        status: 401,
      })) as typeof globalThis.fetch;

    await assert.rejects(() => search('hello'), /401/);
  });
});
