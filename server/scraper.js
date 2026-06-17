import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeURL(url) {
  try {
    // Add custom User-Agent headers to resemble a real browser request
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pl,en-US;q=0.7,en;q=0.3'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 1. Get title
    const title = $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('h1').first().text().trim() || 
                  url;

    // 2. Get meta description
    const metaDescription = $('meta[name="description"]').attr('content') || 
                            $('meta[property="og:description"]').attr('content') || 
                            $('meta[name="twitter:description"]').attr('content') || 
                            "";

    // 3. Extract body content while ignoring noise tags
    // Remove unwanted elements
    $('script, style, svg, iframe, noscript, nav, footer, header, link, .header, .footer, #header, #footer, .nav, .menu, .navigation').remove();

    // Get clean text inside body
    let bodyText = $('body').text();

    // Clean up whitespace: replace multiple spaces/newlines with a single space
    bodyText = bodyText
      .replace(/\s+/g, ' ')
      .replace(/\t+/g, ' ')
      .trim();

    // Limit text length to avoid pushing too many tokens to LLM (e.g. max 8000 chars)
    if (bodyText.length > 8000) {
      bodyText = bodyText.substring(0, 8000) + '...';
    }

    return {
      success: true,
      title,
      metaDescription,
      bodyText,
      url
    };
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error.message);
    return {
      success: false,
      error: error.message,
      title: url,
      metaDescription: '',
      bodyText: ''
    };
  }
}
