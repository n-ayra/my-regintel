import { NextResponse } from 'next/server';
import { supabase } from '@/lib/core/database';

type Article = {
  id: number;
  url: string;
  title: string;
};

type VerifiedUpdateRaw = {
  id: number;
  deduced_title: string;
  summary_text: string;
  impact_level: 'High' | 'Medium' | 'Low';
  primary_source_url: string | null;
  related_article_ids: (number | string)[];
  created_at: string;
};

type LatestVerifiedRow = {
  regulation_id: string;
  deduced_published_date: string | null;
  verified_update_id: VerifiedUpdateRaw;
};

export async function GET() {
  const { data, error } = await supabase
    .from<LatestVerifiedRow>('latest_verified_updates')
    .select(`
      regulation_id,
      deduced_published_date,
      verified_update_id (
        id,
        deduced_title,
        summary_text,
        impact_level,
        primary_source_url,
        related_article_ids,
        created_at
      )
    `);

  if (error) return NextResponse.json([], { status: 500 });

  // Flatten related_article_ids
  const allRelatedIds: number[] = data
    ?.flatMap(row =>
      (row.verified_update_id.related_article_ids ?? []).map(id => Number(id))
    ) ?? [];

  // Fetch all related articles
  const { data: articlesData } = allRelatedIds.length > 0
    ? await supabase.from<Article>('raw_articles')
        .select('id, url, title')
        .in('id', allRelatedIds)
    : { data: [] as Article[] };

  const articlesMap = new Map(articlesData?.map(a => [a.id, a]));

  // Build verified updates
  const updates = (data ?? []).map(row => {
    const raw = row.verified_update_id;
    const related_articles: Article[] = (raw.related_article_ids ?? [])
      .map(id => articlesMap.get(Number(id)))
      .filter((a): a is Article => Boolean(a)); // type guard

    return {
      id: raw.id,
      regulation: row.regulation_id,
      deduced_title: raw.deduced_title,
      summary_text: raw.summary_text,
      impact_level: raw.impact_level,
      primary_source_url: raw.primary_source_url,
      related_articles,
      deduced_published_date: row.deduced_published_date,
      created_at: raw.created_at,
    };
  });

  return NextResponse.json(updates);
}
