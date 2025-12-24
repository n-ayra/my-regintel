import { NextResponse } from 'next/server';
import { supabase } from '@/lib/core/database';

type Article = {
  id: number;
  url: string;
  title: string;
};

type LatestVerifiedRow = {
  id: number;
  regulation: string;
  regulation_name: string; 
  deduced_title: string;
  summary_text: string;
  impact_level: 'high' | 'medium' | 'low' | null;
  primary_source_url: string | null;
  related_article_ids: string | null; // Supabase view returns string
  deduced_published_date: string | null;
  created_at: string;
};

export async function GET() {
  const { data, error } = await supabase
    .from('latest_verified_updates')
    .select(`
      id,
      regulation,
      regulation_name,
      deduced_title,
      summary_text,
      impact_level,
      primary_source_url,
      related_article_ids,
      deduced_published_date,
      created_at
    `);

  if (error) {
    console.error('Fetch error:', error);
    return NextResponse.json([], { status: 500 });
  }

  // Parse all related IDs from string
  const allRelatedIds: number[] = data
    ?.flatMap((row: LatestVerifiedRow) => {
      try {
        return JSON.parse(row.related_article_ids || '[]').map(Number);
      } catch {
        return [];
      }
    }) ?? [];

  const { data: articlesData } = allRelatedIds.length > 0
    ? await supabase
        .from('raw_articles')
        .select('id, url, title')
        .in('id', allRelatedIds)
    : { data: [] as Article[] };

  const articlesMap = new Map<number, Article>(
    articlesData?.map((a: Article) => [a.id, a])
  );

  const updates = (data ?? []).map((row: LatestVerifiedRow) => {
    const relatedIds: number[] = (() => {
      try {
        return JSON.parse(row.related_article_ids || '[]').map(Number);
      } catch {
        return [];
      }
    })();

    const related_articles: Article[] = relatedIds
      .map((id) => articlesMap.get(id))
      .filter((a): a is Article => Boolean(a));

    return {
      id: row.id,
      regulation: row.regulation,
      regulation_name: row.regulation_name, // stays intact
      deduced_title: row.deduced_title,
      summary_text: row.summary_text,
      impact_level: row.impact_level?.toLowerCase() as 'high' | 'medium' | 'low' | undefined,
      primary_source_url: row.primary_source_url,
      related_articles,
      deduced_published_date: row.deduced_published_date,
      created_at: row.created_at,
    };
  });

  return NextResponse.json(updates);
}
