import { ActionsResult } from '@mendable/firecrawl-js';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import pdf from 'pdf-parse';

interface FirecrawlDocument<
  T = any,
  ActionsSchema extends ActionsResult | never = never,
> {
  url?: string;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  extract?: T;
  json?: T;
  screenshot?: string;
  metadata?: Record<string, any>;
  actions: ActionsSchema;
  title?: string;
  description?: string;
}

interface SearchResponse {
  success: boolean;
  data: FirecrawlDocument<undefined>[];
  warning?: string;
  error?: string;
}

/**
 * Utility: Scrapes the given URL and extracts readable markdown-like content.
 */
export async function scrapeMarkdown(
  url: string,
): Promise<{ html: string; markdown: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const res = await fetch(url, { signal: controller.signal }); // ✅ no "timeout" property

    const contentType = res.headers.get('content-type') || '';

    if (
      contentType.includes('application/pdf') ||
      url.toLowerCase().endsWith('.pdf')
    ) {
      // ✅ Handle PDF separately
      const buffer = await res.arrayBuffer();
      const pdfData = await pdf(Buffer.from(buffer));
      return {
        html: '', // no HTML for PDFs
        markdown: pdfData.text || '', // raw extracted text
      };
    }

    const html = await res.text();

    const $ = cheerio.load(html);
    $('script, style, noscript').remove();

    const textBlocks: string[] = [];
    $('p, h1, h2, h3, li').each((_, el) => {
      const tag = el.tagName.toLowerCase();
      let prefix = '';
      if (tag === 'h1') prefix = '# ';
      else if (tag === 'h2') prefix = '## ';
      else if (tag === 'h3') prefix = '### ';
      else if (tag === 'li') prefix = '- ';
      const content = $(el).text().trim();
      if (content) textBlocks.push(`${prefix}${content}`);
    });

    return {
      html,
      markdown: textBlocks.join('\n\n'),
    };
  } catch (err) {
    console.warn(`Failed to fetch ${url}:`, err);
    return { html: '', markdown: '' };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Replacement search function for Firecrawl
 */
export async function searchWithSerper(query: string): Promise<SearchResponse> {
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query }),
    });

    if (!res.ok) throw new Error(`API Error: ${res.status}`);

    const json = await res.json();

    const organicResults = (json as any).organic || [];
    const results: FirecrawlDocument[] = [];

    for (const item of organicResults) {
      const { html, markdown } = await scrapeMarkdown(item.link);
      results.push({
        url: item.link,
        title: item.title,
        description: item.snippet,
        html,
        rawHtml: html,
        markdown,
        links: [], // you can parse <a> tags here if needed
        actions: {} as never,
      });
    }

    return { success: true, data: results };
  } catch (e: any) {
    return {
      success: false,
      data: [],
      error: e.message ?? 'No result found',
    };
  }
}
