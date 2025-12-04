// lib/searchSVHC.ts
import { tavilySearch } from './tavily';
import { supabase } from './supabaseClient';
import crypto from 'crypto';

export async function searchSVHCNews() {
  // Perform Tavily search for SVHC updates
  const searchRes = await tavilySearch(
    'SVHC REACH candidate list update',
    10,   // max results
    180   // last 180 days
  );

  const results: {
    title: string;
    url: string;
    content: string;
    published_date: string;
    hash: string;
  }[] = [];

  for (const item of searchRes.results) {
    // Create hash to check duplicates
    const hash = crypto.createHash('sha256').update(item.url).digest('hex');

    // Check if this article already exists
    const exists = await supabase
      .from('svhc_articles')
      .select('id')
      .eq('hash', hash)
      .single();

    if (!exists.data) {
      // Add to results
      results.push({
        title: item.title,
        url: item.url,
        content: item.content,
        published_date: new Date().toISOString(),
        hash
      });

      // Store in Supabase
      await supabase.from('svhc_articles').insert([
        {
          title: item.title,
          url: item.url,
          content: item.content,
          summary: '',
          published_date: new Date().toISOString(),
          hash
        }
      ]);
    }
  }

  return results;
}
