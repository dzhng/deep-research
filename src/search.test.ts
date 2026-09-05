import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import FirecrawlApp from '@mendable/firecrawl-js';

import { search } from './search';

const originalEnv = { ...process.env };
afterEach(() => {
  mock.restoreAll();
  process.env = { ...originalEnv };
});

const page = (index: number) => ({
  url: `https://example.com/${index}`,
  title: `Page ${index}`,
  excerpts: [`Excerpt ${index}`],
});

function mockMcp(onTool: (name: string, args: Record<string, any>) => unknown) {
  process.env.SEARCH_PROVIDER = 'parallel';
  delete process.env.FIRECRAWL_KEY;
  return mock.method(
    globalThis,
    'fetch',
    async (_input: string | URL | Request, init?: RequestInit) => {
      assert.ok(init);
      assert.equal(init.redirect, 'error');
      assert.ok(init.signal instanceof AbortSignal);
      assert.equal(new Headers(init.headers).get('authorization'), null);
      assert.equal(new Headers(init.headers).get('x-api-key'), null);
      const request = init.body ? JSON.parse(init.body as string) : undefined;
      if (!request) return new Response(null, { status: 405 });
      if (request.id === undefined) return new Response(null, { status: 202 });
      const result =
        request.method === 'initialize'
          ? {
              protocolVersion: request.params.protocolVersion,
              capabilities: { tools: {} },
              serverInfo: { name: 'fixture', version: '1' },
            }
          : onTool(request.params.name, request.params.arguments);
      return Response.json({ jsonrpc: '2.0', id: request.id, result });
    },
  );
}

function toolResult(payload: unknown, structured = true) {
  return structured
    ? { content: [], structuredContent: payload }
    : { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

test('search fetches at most five pages and maps full text in search order', async () => {
  const calls: string[] = [];
  const warnings = mock.method(console, 'warn', () => {});
  mockMcp((name, args) => {
    calls.push(name);
    assert.equal(args.session_id, 'research-session');
    if (name === 'web_search') {
      assert.equal(args.objective, 'research goal');
      assert.deepEqual(args.search_queries, ['query']);
      return toolResult({
        results: Array.from({ length: 7 }, (_, i) => page(i)),
      });
    }
    assert.deepEqual(
      args.urls,
      [0, 1, 2, 3, 4].map(i => page(i).url),
    );
    assert.equal(args.full_content, true);
    return toolResult(
      {
        results: [4, 2, 1, 0].map(i => ({
          ...page(i),
          full_content: `Full ${i}`,
        })),
        errors: [{ url: page(3).url, error_type: 'FETCH_FAILED' }],
        warnings: [{ type: 'notice', message: 'Some pages were unavailable' }],
      },
      false,
    );
  });
  const result = await search('query', 'research goal', 'research-session');
  assert.deepEqual(calls, ['web_search', 'web_fetch']);
  assert.deepEqual(
    result.data,
    [0, 1, 2, 4].map(i => ({
      url: page(i).url,
      title: page(i).title,
      markdown: `Full ${i}`,
    })),
  );
  assert.equal(warnings.mock.callCount(), 2);
});

test('uses excerpts when fetched full content is absent', async () => {
  mockMcp(() => toolResult({ results: [page(0)] }));
  assert.equal(
    (await search('query', 'goal', 'session')).data[0]?.markdown,
    'Excerpt 0',
  );
});

test('empty search succeeds without fetching', async () => {
  const requests = mockMcp(() => toolResult({ results: [] }));
  assert.deepEqual(await search('query', 'goal', 'session'), { data: [] });
  const toolCalls = requests.mock.calls.filter(call =>
    String(call.arguments[1]?.body).includes('tools/call'),
  );
  assert.equal(toolCalls.length, 1);
});

for (const [label, response] of [
  [
    'tool error',
    { isError: true, content: [{ type: 'text', text: 'rate limited' }] },
  ],
  ['missing results', toolResult({})],
  ['malformed page', toolResult({ results: [{ url: 'not a url' }] })],
  ['invalid JSON', { content: [{ type: 'text', text: 'not JSON' }] }],
] as const) {
  test(`rejects ${label} instead of returning empty results or falling back`, async () => {
    const firecrawl = mock.method(
      FirecrawlApp.prototype,
      'search',
      async () => {
        throw Error('unexpected Firecrawl');
      },
    );
    mockMcp(() => response);
    await assert.rejects(search('query', 'goal', 'session'));
    assert.equal(firecrawl.mock.callCount(), 0);
  });
}

for (const provider of [undefined, 'firecrawl']) {
  test(`preserves Firecrawl options when provider is ${provider}`, async () => {
    if (provider) process.env.SEARCH_PROVIDER = provider;
    else delete process.env.SEARCH_PROVIDER;
    process.env.FIRECRAWL_KEY = 'fixture-key';
    process.env.FIRECRAWL_BASE_URL = 'https://firecrawl.example';
    const expected = {
      success: true,
      data: [{ url: page(0).url, markdown: 'Original' }],
    };
    mock.method(
      FirecrawlApp.prototype,
      'search',
      async function (
        this: FirecrawlApp,
        query: string,
        options: Parameters<FirecrawlApp['search']>[1],
      ) {
        assert.equal(this.apiKey, 'fixture-key');
        assert.equal(this.apiUrl, 'https://firecrawl.example');
        assert.equal(query, 'query');
        assert.deepEqual(options, {
          timeout: 15000,
          limit: 5,
          scrapeOptions: { formats: ['markdown'] },
        });
        return expected;
      },
    );
    assert.equal(await search('query', 'goal', 'session'), expected);
  });
}

test('unknown provider fails before dispatch', async () => {
  process.env.SEARCH_PROVIDER = 'typo';
  const requests = mock.method(globalThis, 'fetch', async () => {
    throw Error('unexpected request');
  });
  await assert.rejects(
    search('query', 'goal', 'session'),
    /Unknown SEARCH_PROVIDER/,
  );
  assert.equal(requests.mock.callCount(), 0);
});

test('rejects oversized response bodies before buffering them', async () => {
  process.env.SEARCH_PROVIDER = 'parallel';
  let chunks = 0;
  mock.method(
    globalThis,
    'fetch',
    async () =>
      new Response(
        new ReadableStream({
          pull(controller) {
            chunks++;
            controller.enqueue(new Uint8Array(1024 * 1024));
            if (chunks === 20) controller.close();
          },
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
  );
  await assert.rejects(search('query', 'goal', 'session'), /exceeds 10 MiB/);
  assert.ok(chunks < 20);
});

for (const [label, response] of [
  ['HTTP failure', () => new Response('Unavailable', { status: 503 })],
  [
    'RPC error inside HTTP 200',
    (id: number) =>
      Response.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: 'Service failure' },
      }),
  ],
] as const) {
  test(`rejects ${label}`, async () => {
    process.env.SEARCH_PROVIDER = 'parallel';
    mock.method(
      globalThis,
      'fetch',
      async (_input: string | URL | Request, init?: RequestInit) =>
        response(JSON.parse(String(init?.body)).id),
    );
    await assert.rejects(search('query', 'goal', 'session'));
  });
}

test('independent research sessions do not share tool metadata', async () => {
  const sessions: string[] = [];
  mockMcp((_name, args) => {
    sessions.push(args.session_id);
    return toolResult({ results: [] });
  });
  await search('first query', 'first goal', 'first-session');
  await search('second query', 'second goal', 'second-session');
  assert.deepEqual(sessions, ['first-session', 'second-session']);
});
