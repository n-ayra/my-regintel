import { tavily } from '@tavily/core';

export type TavilyArticle = {
  url: string;
  title?: string | null;
  snippet?: string | null;
  source?: string | null;
  domain?: string | null;
  content?: string | null;
  published_date?: string | null;
};

// Accept any options to avoid TS errors
export async function tavilySearch(
  query: string,
  opts: Record<string, any> = {}
): Promise<TavilyArticle[]> {
  const size = opts.size ?? 20;

  const res = await tavily().search(query, { max_results: size }); 

  if (!res?.results || !Array.isArray(res.results)) return [];

  return res.results.map((r: any) => {
    let hostname: string | null = null;
    try {
      hostname = new URL(r.url).hostname;
    } catch {}

    return {
      url: r.url,
      title: r.title ?? null,
      snippet: r.content ?? null,
      content: r.content ?? null,
      published_date: r.published_date ?? null,
      source: hostname,
      domain: hostname,
    };
  });
}

export async function tavilyExtract(
  url: string
): Promise<{ rawContent: string; markdownContent: string }> {
  const res = await tavily().extract([url]);
  const item = res?.results?.[0] as any; // <-- cast to any to bypass TS errors

  return {
    rawContent: item?.rawContent ?? '',
    markdownContent: item?.markdownContent ?? item?.rawContent ?? ''
  };
}
