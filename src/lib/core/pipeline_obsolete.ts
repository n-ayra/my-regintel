// External Libraries
import * as chrono from 'chrono-node';
import dayjs from 'dayjs';
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

// Library/Module Initialization
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// Internal Modules
import { buildSynthesisPrompt } from "@/lib/regulations/svhc/processors";
import { supabase } from './database';
import { askOpenAI } from './openai';
import type { ArticleSummary } from '@/lib/core/semantic';
import { semanticGroupSummaries } from '@/lib/core/semantic';
import { tavilyExtract, tavilySearch, TavilyArticle as TavilyArticleCore } from './tavily';

// --- Type Definitions ---

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
  impact_level?: 'high' | 'medium' | 'low' | 'none';
  evidence_summary?: string;
  article_published_date?: string | null;
  claims?: any[];
  change_scope?: string; 
  [key: string]: any;
};


//Fetch regulation config (start of scaling up to 21 regs)

const regulations = await supabase
  .from('regulations')
  .select(`
    id,
    name,
    regulation_search_profiles (
      authority,
      search_queries,
      primary_sources
    )
  `);



// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Scan and store articles
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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
// Synthesize articles using OpenAI 
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



function inferImpactLevel(text: string): 'high' | 'medium' | 'low' {
  if (/ban|mandatory|require|prohibit|enforce/i.test(text)) return 'high';
  if (/amend|update|revise|consultation/i.test(text)) return 'medium';
  return 'low';
}

function buildAnchor(candidate: CandidateUpdate, regulationId: string) {
  const updateType = candidate.update_type ?? 'unspecified';
  const eventMonth = candidate.article_published_date
    ? dayjs(candidate.article_published_date).format('YYYY-MM')
    : 'unspecified';
  const changeScope = candidate.change_scope ?? 'unspecified';

  return `${regulationId}::${updateType}::${eventMonth}::${changeScope}`;
}


//This is what is going to run the 21 regulations
export async function runAllRegulationsPipeline() {
  const { data: regulations, error } = await supabase
    .from('regulations')
    .select(`
      id,
      name,
      regulation_search_profiles (
        authority,
        search_queries,
        primary_sources
      )
    `);

  if (error) {
    console.error('Error fetching regulations', error);
    return;
  }

  for (const regulation of regulations || []) {
    for (const profile of regulation.regulation_search_profiles) {
      for (const query of profile.search_queries) {
        const rawArticles = await scanAndStoreArticles({
          id: regulation.id,
          searchQueries: [query]
        });

        if (!rawArticles.length) continue;

        await runRegulationPipeline({
          config: { id: regulation.id, searchQueries: [query] }
        });
      }
    }

    // Update last_scanned_at
    await supabase
      .from('regulations')
      .update({ last_scanned_at: new Date().toISOString() })
      .eq('id', regulation.id);
  }
}



export async function runRegulationPipeline({
  config,
  synthesisPromptBuilder = buildSynthesisPrompt,
  maxSearchPerQuery = 5
}: {
  config: RegConfig;
  synthesisPromptBuilder?: (article: TavilyArticle, config: RegConfig) => string;
  maxSearchPerQuery?: number;
}) {
  console.log('Pipeline started for config:', config.id);

  // 1️⃣ Scan + store new articles
  const insertedIds = await scanAndStoreArticles(config, maxSearchPerQuery);
  if (!insertedIds.length) return { ok: true, consensus: false };

  // 2️⃣ Fetch newly inserted articles
  const { data: rawRows } = await supabase
    .from('raw_articles')
    .select('*')
    .in('id', insertedIds)
    .order('published_at', { ascending: false });

  const articles: TavilyArticle[] = rawRows ?? [];
  if (articles.length === 0) return { ok: true, consensus: false };

  // 3️⃣ Synthesize articles
  const candidates = await synthesizeArticles(config, articles, synthesisPromptBuilder);
  if (candidates.length === 0) return { ok: true, consensus: false };

  // 4️⃣ Deduplicate / merge with semantic consensus
  const candidateAnchors: Record<string, CandidateUpdate[]> = {};
  for (const c of candidates) {
    const anchor = buildAnchor(c, config.id);
    if (!candidateAnchors[anchor]) candidateAnchors[anchor] = [];
    candidateAnchors[anchor].push(c);
  }

  const finalCandidates: CandidateUpdate[] = [];

  for (const anchor in candidateAnchors) {
    const group = candidateAnchors[anchor];

    // Single candidate: assign merged_article_ids
    if (group.length === 1) {
      const single = group[0];
      if (!single.update_summary || !single.article_id) continue;
      single.merged_article_ids = [single.article_id];
      finalCandidates.push(single);
      continue;
    }

    // Multiple candidates: perform semantic merge
    const summariesForSemantic: ArticleSummary[] = group
      .filter(c => c.update_summary && c.article_id)
      .map(c => ({
        id: c.article_id!,
        summary: c.update_summary!,
        published_date: c.article_published_date ?? null
      }));

    const consensus = await semanticGroupSummaries(summariesForSemantic);

    if (consensus) {
      finalCandidates.push({
        ...group[0], // base candidate
        update_summary: consensus.mergedSummary,
        article_published_date: consensus.latestDate,
        merged_article_ids: consensus.articleIds
      });
    } else {
      // fallback: mark each with its own article_id
      group.forEach(c => {
        if (!c.update_summary || !c.article_id) return;
        c.merged_article_ids = [c.article_id];
        finalCandidates.push(c);
      });
    }
  }

  // 5️⃣ Insert into verified_updates and latest_verified_updates
  for (const candidate of finalCandidates) {
    if (!candidate.update_summary || !candidate.merged_article_ids?.length) continue;

    // Map to DB constraint-safe impact_level
    const impact_level = inferImpactLevel(candidate.update_summary);

    const { data: inserted, error } = await supabase
      .from('verified_updates')
      .insert({
        regulation: config.id,
        deduced_title: candidate.update_summary.slice(0, 100),
        summary_text: candidate.update_summary,
        impact_level: impact_level,
        related_article_ids: candidate.merged_article_ids,
        created_at: new Date().toISOString(),
        deduced_published_date: candidate.article_published_date
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting verified_update', error);
      continue;
    }

    // Upsert latest_verified_updates
    await supabase
      .from('latest_verified_updates')
      .upsert({
        regulation_id: config.id,
        verified_update_id: inserted.id,
        deduced_published_date: candidate.article_published_date
      });

    // Mark all contributing raw_articles as processed
    await supabase
      .from('raw_articles')
      .update({ is_processed: true })
      .in('id', candidate.merged_article_ids);
  }

  console.log('Pipeline finished for config:', config.id);
  return { ok: true, consensus: true };
}


