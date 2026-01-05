import dayjs from 'dayjs';
import { askOpenAI } from '@/lib/core/openai';

export type ArticleSummary = {
  id: number;
  summary: string;
  published_date: string | null;
};

export type SemanticResult = {
  mergedSummary: string;
  articleIds: number[];
  latestDate: string | null;
};

export async function semanticGroupSummaries(
  summaries: ArticleSummary[]
): Promise<SemanticResult | null> {
  if (summaries.length < 2) return null;

  // Pick the first summary as anchor
  const anchor = summaries[0];

  // Compare all summaries in parallel
  const comparisonResults = await Promise.all(
    summaries.slice(1).map(async (candidate) => {
      const same = await roughlySameUpdate(anchor.summary, candidate.summary);
      return same ? candidate : null;
    })
  );

  // Build group with anchor + matching candidates
  const group = [anchor, ...comparisonResults.filter(Boolean) as ArticleSummary[]];

  if (group.length < 2) return null;

  // Calculate latest date safely
  const now = dayjs();
  const latestDate = group
    .map(g => g.published_date)
    .filter(Boolean)
    .map(d => dayjs(d))
    .filter(d => !d.isAfter(now)) // remove future dates
    .sort((a, b) => b.valueOf() - a.valueOf())[0]
    ?.toISOString() ?? null;

  return {
    mergedSummary: group.map(g => g.summary).join(' '),
    articleIds: group.map(g => g.id),
    latestDate,
  };
}

// OpenAI helper
async function roughlySameUpdate(a: string, b: string): Promise<boolean> {
  const response = await askOpenAI([
    {
      role: 'system',
      content: 'You decide whether two summaries describe the same regulatory update.'
    },
    {
      role: 'user',
      content: `
Summary A:
${a}

Summary B:
${b}

Answer only YES or NO.
      `
    }
  ]);

  // Normalize response safely
  return response.replace(/\W/g, '').toUpperCase() === 'YES';
}
