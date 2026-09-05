import FirecrawlApp from '@mendable/firecrawl-js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';

export type SearchResult = {
  data: { url?: string; title?: string; markdown?: string }[];
};

const pageSchema = z.object({
  url: z.string().url(),
  title: z.string().nullish(),
  excerpts: z.array(z.string()),
  full_content: z.string().nullish(),
});
const payloadSchema = z.object({
  results: z.array(pageSchema),
  warnings: z.array(z.unknown()).nullish(),
  errors: z
    .array(z.object({ url: z.string(), error_type: z.string() }))
    .optional(),
});

// The SDK owns MCP negotiation and response framing. Bound each HTTP body
// before it is buffered, and keep every request within the same deadline.
function boundedFetch(signal: AbortSignal): typeof fetch {
  return async (input, init) => {
    const response = await fetch(input, {
      ...init,
      redirect: 'error',
      signal: init?.signal ? AbortSignal.any([signal, init.signal]) : signal,
    });
    if (!response.body) return response;
    let bytes = 0;
    const body = response.body.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          bytes += chunk.byteLength;
          if (bytes > 10 * 1024 * 1024) {
            throw new Error('Parallel response exceeds 10 MiB');
          }
          controller.enqueue(chunk);
        },
      }),
    );
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

async function parallelSearch(
  query: string,
  objective: string,
  sessionId: string,
): Promise<SearchResult> {
  const signal = AbortSignal.timeout(60_000);
  const client = new Client({ name: 'deep-research', version: '0.0.1' });
  const transport = new StreamableHTTPClientTransport(
    new URL('https://search.parallel.ai/mcp'),
    { fetch: boundedFetch(signal) },
  );

  async function call(name: string, args: Record<string, unknown>) {
    const result = await client.callTool(
      { name, arguments: { ...args, session_id: sessionId } },
      undefined,
      { signal },
    );
    if (result.isError) throw new Error(`Parallel ${name} failed`);
    const payload = payloadSchema.parse(
      result.structuredContent ??
        JSON.parse(
          (result.content as { type: string; text?: string }[])
            .filter(item => item.type === 'text')
            .map(item => item.text)
            .join('\n'),
        ),
    );
    for (const warning of payload.warnings ?? []) console.warn(warning);
    for (const error of payload.errors ?? []) {
      console.warn(
        `Parallel could not fetch ${error.url}: ${error.error_type}`,
      );
    }
    return payload.results;
  }

  try {
    await client.connect(transport, { signal });
    const results = await call('web_search', {
      objective,
      search_queries: [query],
    });
    const urls = [...new Set(results.map(result => result.url))].slice(0, 5);
    if (!urls.length) return { data: [] };
    const pages = await call('web_fetch', { urls, full_content: true });
    return {
      data: urls.flatMap(url => {
        const page = pages.find(page => page.url === url);
        // Failed URLs stay visible in warnings and are not passed off as pages.
        if (!page) return [];
        return [
          {
            url,
            title: page.title ?? undefined,
            markdown: page.full_content ?? page.excerpts.join('\n\n'),
          },
        ];
      }),
    };
  } finally {
    // Closing the SDK aborts its requests; cleanup must not replace the result.
    await client.close().catch(() => {});
  }
}

export async function search(
  query: string,
  objective: string,
  sessionId: string,
): Promise<SearchResult> {
  const provider = process.env.SEARCH_PROVIDER ?? 'firecrawl';
  if (provider === 'parallel')
    return parallelSearch(query, objective, sessionId);
  if (provider !== 'firecrawl') {
    throw new Error(`Unknown SEARCH_PROVIDER: ${provider}`);
  }
  const firecrawl = new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_KEY ?? '',
    apiUrl: process.env.FIRECRAWL_BASE_URL,
  });
  return firecrawl.search(query, {
    timeout: 15000,
    limit: 5,
    scrapeOptions: { formats: ['markdown'] },
  });
}
