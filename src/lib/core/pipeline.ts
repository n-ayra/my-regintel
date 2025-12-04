// src/lib/core/pipeline.ts
import { supabase } from './database';
import { tavilySearch, tavilyExtract, TavilyArticle as TavilyArticleCore } from './tavily';
import { askOpenAI } from './openai';
import dayjs from 'dayjs';

export type TavilyArticle = TavilyArticleCore;

export type RegConfig = {
  id: string;
  searchQueries: string[];
  primarySourceUrl?: string;
  allowedDomains?: string[];
  triggerWords?: string[]; 
  maxArticles?: number;

};

export type CandidateUpdate = any;
export type VerificationResult = any;


export async function scanAndStoreArticles(config: { id: string; searchQueries: string[] }, maxPerQuery = 10): Promise<number[]> {
  console.log(`Scanning articles for config: ${config.id}`);

  const aggregatedResults: TavilyArticle[] = [];
  const sixMonthsAgo = dayjs().subtract(6, 'month').format('YYYY-MM-DD');

  for (const query of config.searchQueries) {
    try {
      const results = await tavilySearch(query, {
        size: maxPerQuery,
        start_date: sixMonthsAgo,       
        include_raw_content: true,      
        max_results: maxPerQuery,
        include_answer: false
      });
      console.log(`Found ${results.length} articles for query "${query}"`);
      aggregatedResults.push(...results);
    } catch (err) {
      console.error('Tavily search error', query, err);
    }
  }

  const insertedIds: number[] = [];

  for (const art of aggregatedResults) {
    try {
      const { data: existing } = await supabase.from('raw_articles').select('id').eq('url', art.url).limit(1);
      if (!existing || existing.length === 0) {
        const { data, error } = await supabase.from('raw_articles').insert({
          url: art.url,
          title: art.title ?? null,
          snippet: art.snippet ?? null,
          content: art.content ?? null,
          source: art.source ?? art.domain ?? null,
          regulation: config.id,
          is_processed: false,
          published_at: art.published_date ?? null
        }).select('id').single();

        if (error) console.error('Insert raw article error:', error);
        if (data?.id) {
          insertedIds.push(data.id);
          console.log('Inserted raw article ID:', data.id);
        }
      }
    } catch (err) {
      console.error('Insert article exception', art.url, err);
    }
  }

  return insertedIds;
}


/**
 * Summarize each article with OpenAI based on regulation prompt
 */
export async function synthesizeArticles(config: RegConfig, articles: TavilyArticle[]): Promise<CandidateUpdate[]> {
  const results: CandidateUpdate[] = [];

  for (const article of articles) {
    const prompt = `
You are an expert regulation impact analyst.
Regulation: ${JSON.stringify(config)}
Article: ${JSON.stringify({
      title: article.title,
      url: article.url,
      published_date: article.published_date,
      content: article.content
    })}
Your task: Evaluate whether the article affects the regulation based on key_identifiers, trigger_types, and review_conditions.
Respond in JSON format with:
{
  "regulation": string,
  "impact_level": "high" | "medium" | "low" | "none",
  "matches": {
    "key_identifiers": [],
    "trigger_events": [],
    "review_conditions_met": []
  },
  "summary": string
}
Follow the schema strictly.
`;

    try {
      const response = await askOpenAI([
        { role: 'system', content: 'You are an expert regulatory analyst.' },
        { role: 'user', content: prompt }
      ]);

      const parsed = typeof response === 'string' ? JSON.parse(response) : response;
      results.push(parsed);
    } catch (err) {
      console.error('OpenAI article synthesis failed', article.url, err);
    }
  }

  return results;
}

/**
 * Extract primary source and summarize
 */
export async function extractAndSummarizePrimarySource(config: RegConfig): Promise<string> {
  if (!config.primarySourceUrl) return '';
  try {
    const text = await tavilyExtract(config.primarySourceUrl);
    const content = text.markdownContent || text.rawContent || '';

    const prompt = `
You are an expert regulatory analyst.
Summarize the primary source for regulation ${config.id}.
Text: ${content}
Output a concise summary of key points relevant to regulatory changes.
`;
    const summary = await askOpenAI([
      { role: 'system', content: 'You are an expert regulatory analyst.' },
      { role: 'user', content: prompt }
    ]);

    return typeof summary === 'string' ? summary : JSON.stringify(summary);
  } catch (err) {
    console.error('Primary source extraction failed', err);
    return '';
  }
}

/**
 * Verify candidate updates against primary source
 */
export async function verifyAndStoreUpdate(
  config: RegConfig,
  candidates: CandidateUpdate[],
  primarySourceSummary: string
) {
  for (const candidate of candidates) {
    const prompt = `
Compare the candidate article summary against the primary source summary.
Candidate: ${JSON.stringify(candidate)}
PrimarySource: ${primarySourceSummary}
Determine if this constitutes an actual regulatory update. Respond in JSON with fields:
{
  "deduced_title": string,
  "summary_text": string,
  "impact_level": "high" | "medium" | "low",
  "primary_source_url": string | null
}
`;
    try {
      const response = await askOpenAI([
        { role: 'system', content: 'You are a compliance auditor.' },
        { role: 'user', content: prompt }
      ]);

      const verdict = typeof response === 'string' ? JSON.parse(response) : response;

      const { data: inserted, error } = await supabase.from('verified_updates')
        .insert({
          regulation: config.id,
          deduced_title: verdict.deduced_title ?? candidate.summary ?? 'Regulatory update',
          summary_text: verdict.summary_text ?? candidate.summary ?? '',
          impact_level: verdict.impact_level ?? 'Medium',
          primary_source_url: verdict.primary_source_url ?? config.primarySourceUrl ?? null,
          related_article_ids: candidates.map(c => c.article_id ?? null),
          verification_status: true
        })
        .select('id')
        .single();

      if (error) console.error('Failed to insert verified update', error);
      if (inserted?.id) console.log('Inserted verified update ID:', inserted.id);

      // mark raw articles as processed
      const articleIds = candidates.map(c => c.article_id).filter(Boolean);
      if (articleIds.length > 0) {
        await supabase.from('raw_articles').update({ is_processed: true }).in('id', articleIds);
      }
    } catch (err) {
      console.error('Verification failed', err);
    }
  }
}

/**
 * Main pipeline
 */
export async function runRegulationPipeline({
  config,
  synthesisPromptBuilder,
  verificationPromptBuilder,
  maxSearchPerQuery = 10
}: {
  config: RegConfig,
  synthesisPromptBuilder: (articles: TavilyArticle[]) => string,
  verificationPromptBuilder: (candidate: any, officialText: string) => string,
  maxSearchPerQuery?: number
}) {
  console.log('Pipeline started for config:', config.id);

  // 1. Scan and store articles
  const insertedIds = await scanAndStoreArticles(config, 10);

  // 2. Fetch unprocessed articles
  const { data: rawRows } = await supabase.from('raw_articles')
    .select('*')
    .eq('is_processed', false)
    .eq('regulation', config.id)
    .order('published_at', { ascending: false })
    .limit(10);

  const articles: TavilyArticle[] = rawRows ?? [];

  // 3. Synthesize article summaries
  const candidates = await synthesizeArticles(config, articles);

  // 4. Extract and summarize primary source
  const primarySourceSummary = await extractAndSummarizePrimarySource(config);

  // 5. Verify candidates against primary source
  await verifyAndStoreUpdate(config, candidates, primarySourceSummary);

  return { ok: true, insertedIds, candidates };
}
