import axios from 'axios';
import * as cheerio from 'cheerio';
import { SearchResponse, FirecrawlDocument } from '@mendable/firecrawl-js';

async function search(query: string, params: {
  timeout?: number;
  limit?: number;
  scrapeOptions?: { formats: string[] };
} = {}): Promise<SearchResponse> {
  const { timeout = 15000, limit = 5 } = params;
  const baseUrl = 'https://duckduckgo.com/html/';
  
  try {
    const response = await axios.get(baseUrl, {
      params: {
        q: query,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      },
      timeout,
    });

    const $ = cheerio.load(response.data);
    const results: FirecrawlDocument[] = [];

    // Find all search results with class 'result'
    $('.result').each((i, element) => {
      if (i >= limit) return false;

      const $element = $(element);
      const title = $element.find('.result__title').text().trim();
      const url = $element.find('.result__url').text().trim();
      const snippet = $element.find('.result__snippet').text().trim();

      // Get the actual URL from the href attribute
      const linkHref = $element.find('.result__a').attr('href');
      let actualUrl = '';
      if (linkHref) {
        // Extract the actual URL from DuckDuckGo's redirect URL
        const match = linkHref.match(/uddg=([^&]+)/);
        if (match && match[1]) {
          actualUrl = decodeURIComponent(match[1]);
        }
      }

      const document: FirecrawlDocument = {
        url: actualUrl || url,
        title,
        markdown: `# ${title}\n\n${snippet}`,
        actions: undefined as never
      };

      results.push(document);
    });

    return {
      success: true,
      data: results
    };

  } catch (error) {
    console.error('Search error:', error);
    if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
      return {
        success: false,
        data: [],
        error: 'Timeout'
      };
    }
    
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export default search;