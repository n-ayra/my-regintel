import { supabase } from './database';
import { tavilySearch, tavilyExtract, TavilyArticle as TavilyArticleCore } from './tavily';
import { askOpenAI } from './openai';
import dayjs from 'dayjs';
import { buildSynthesisPrompt } from "@/lib/regulations/svhc/processors";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import * as chrono from 'chrono-node';



export type TavilyArticle = TavilyArticleCore & {
  id?: number;
  published_at?: string;
};

export type RegConfig = {
  id: string;
  searchQueries: string[];
  primarySourceUrl?: string;
  allowedDomains?: string[];
  triggerWords?: string[];
  maxArticles?: number;
};

export type CandidateUpdate = {
  article_id?: number | null;
  explicit_addition_claim?: boolean;
  impact_level?: 'High' | 'Medium' | 'Low' | 'None';
  evidence_summary?: string;
  claims?: any[];
  [key: string]: any;
};

// ---------------------------------------------------------
// Scan and store articles
// ---------------------------------------------------------
export async function scanAndStoreArticles(
  config: { id: string; searchQueries: string[] },
  maxPerQuery = 10
): Promise<number[]> {
  console.log(`Scanning articles for config: ${config.id}`);

  const aggregatedResults: TavilyArticle[] = [];
  const oneYearAgo = dayjs().subtract(1, 'year').startOf('day');

  for (const query of config.searchQueries) {
    try {
      const results = await tavilySearch(query, {
        size: maxPerQuery,
        include_raw_content: true,
        max_results: maxPerQuery,
        include_answer: false
      });

      for (const r of results || []) {
  let publishedDate = r.published_date;

      // Step 1: Extract from article content / HTML
      if (!publishedDate && r.content) {
        const htmlMatch = r.content.match(
          /<meta[^>]*(?:name|property)=["'](?:article:published_time|date)["'][^>]*content=["']([^"']+)["']/i
        );
        if (htmlMatch) publishedDate = htmlMatch[1];
      }


        // Step 2: Fallback to parsing text for dates
        if (!publishedDate && r.content) {
          const parsed = chrono.parse(r.content);
          if (parsed.length > 0) {
            publishedDate = parsed[0].date().toISOString();
          }
        }

        // Step 3: Only keep articles from the last year
        if (publishedDate && dayjs(publishedDate).isSameOrAfter(oneYearAgo)) {
          aggregatedResults.push({ ...r, published_at: publishedDate });
        }
      }

      console.log(
        `Found ${aggregatedResults.length} recent articles for query "${query}" (raw: ${results.length})`
      );
    } catch (err) {
      console.error('Tavily search error', query, err);
    }
  }

  // Insert deduped articles into database
  const insertedIds: number[] = [];
  for (const art of aggregatedResults) {
    try {
      const { data: existing } = await supabase
        .from('raw_articles')
        .select('id')
        .eq('url', art.url)
        .limit(1);

      if (!existing || existing.length === 0) {
        const { data, error } = await supabase
          .from('raw_articles')
          .insert({
            url: art.url,
            title: art.title ?? null,
            snippet: art.snippet ?? null,
            content: art.content ?? null,
            source: art.source ?? art.domain ?? null,
            regulation: config.id,
            is_processed: false,
            published_at: art.published_at ?? null
          })
          .select('id')
          .single();

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

// ---------------------------------------------------------
// Synthesize articles using OpenAI (safely)
// ---------------------------------------------------------
export async function synthesizeArticles(
  config: RegConfig,
  articles: TavilyArticle[],
  promptBuilder: (article: TavilyArticle, config: RegConfig) => string = buildSynthesisPrompt
): Promise<CandidateUpdate[]> {

  if (!articles || articles.length === 0) {
    console.log('No recent articles to summarize. Skipping OpenAI synthesis.');
    return [];
  }

  const results: CandidateUpdate[] = [];

  for (const article of articles) {
    const prompt = promptBuilder(article, config);

    try {
      const response = await askOpenAI([
        { role: 'system', content: 'You are an expert regulatory analyst.' },
        { role: 'user', content: prompt }
      ]);

      let parsed: CandidateUpdate;
      try {
        parsed = typeof response === 'string' ? JSON.parse(response) : response;
      } catch (err) {
        console.warn('OpenAI returned non-JSON response, skipping article:', article.url, 'Response:', response);
        continue;
      }

      parsed.article_id = article.id ?? null;
      results.push(parsed);

    } catch (err) {
      console.error('OpenAI article synthesis failed', article.url, err);
    }
  }

  return results;
}

// ---------------------------------------------------------
// Extract and summarize primary source
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// Verify candidates and store results
// ---------------------------------------------------------
export async function verifyAndStoreUpdate(
  config: RegConfig,
  candidates: CandidateUpdate[],
  primarySourceSummary: string,
  primarySourceRawContent?: string
) {
  if (!candidates || candidates.length === 0) {
    console.log('No candidates to verify. Skipping verification.');
    return;
  }

  for (const candidate of candidates) {
    const claims = candidate.claims ?? [];
    if (!claims.length) {
      console.log('No claims to verify for article:', candidate.article_id);
      continue;
    }

    const prompt = `
You are an expert regulatory verification analyst.
Regulation: ${JSON.stringify(config)}
Primary source text (or summary):
${primarySourceRawContent ?? primarySourceSummary}

Candidate claims (from article ${candidate.article_id}):
${JSON.stringify(claims, null, 2)}

For each claimed substance, output a JSON array of objects:
{
  "name": "<claimed name>",
  "cas": "<cas or null>",
  "claimed_date": "<YYYY-MM-DD|null>",
  "found_in_primary": true|false,
  "primary_mention_text": "<excerpt or empty>",
  "primary_list_date": "<YYYY-MM-DD|null>",
  "date_matches_claim": true|false,
  "reasoning": "<short>"
}
`;

    try {
      const response = await askOpenAI([
        { role: 'system', content: 'You are an expert regulatory verification analyst.' },
        { role: 'user', content: prompt }
      ]);

      let verificationArray: any[] = [];
      try {
        verificationArray = typeof response === 'string' ? JSON.parse(response) : response;
      } catch {
        console.warn('OpenAI returned non-JSON verification response for candidate', candidate.article_id);
      }

      const deducedTitle = candidate.explicit_addition_claim
        ? `Candidate addition claims for ${config.id}`
        : `Candidate: ${candidate.article_id}`;

      const { data: inserted, error } = await supabase.from('verified_updates')
        .insert({
          regulation: config.id,
          deduced_title: deducedTitle,
          summary_text: candidate.evidence_summary ?? '',
          impact_level: candidate.impact_level ?? 'Medium',
          primary_source_url: config.primarySourceUrl ?? null,
          related_article_ids: [candidate.article_id].filter(Boolean),
          verification_status: true,
          verification_details: verificationArray
        })
        .select('id')
        .single();

      if (error) console.error('Failed to insert verified update', error);
      if (inserted?.id) console.log('Inserted verified update ID:', inserted.id);

      if (candidate.article_id) {
        await supabase.from('raw_articles').update({ is_processed: true }).eq('id', candidate.article_id);
      }
    } catch (err) {
      console.error('Verification failed for candidate', candidate.article_id, err);
    }
  }
}

// ---------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------
export async function runRegulationPipeline({
  config,
  synthesisPromptBuilder = buildSynthesisPrompt,
  verificationPromptBuilder,
  maxSearchPerQuery = 5
}: {
  config: RegConfig;
  synthesisPromptBuilder?: (article: TavilyArticle, config: RegConfig) => string;
  verificationPromptBuilder?: (candidate: any, officialText: string) => string;
  maxSearchPerQuery?: number;
}) {
  console.log('Pipeline started for config:', config.id);

  const insertedIds = await scanAndStoreArticles(config, maxSearchPerQuery);

  const { data: rawRows } = await supabase.from('raw_articles')
    .select('*')
    .eq('is_processed', false)
    .eq('regulation', config.id)
    .order('published_at', { ascending: false })
    .limit(maxSearchPerQuery);

  const articles: TavilyArticle[] = rawRows ?? [];

  const candidates = await synthesizeArticles(config, articles, synthesisPromptBuilder);

  const primarySourceSummary = await extractAndSummarizePrimarySource(config);

  await verifyAndStoreUpdate(config, candidates, primarySourceSummary);

  console.log('Pipeline finished for config:', config.id);
  return { ok: true, insertedIds, candidates };
}
