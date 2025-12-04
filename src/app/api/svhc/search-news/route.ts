// app/api/search-news/route.ts
import { NextResponse } from 'next/server';
import { searchSVHCNews } from '@/lib/searchSVHC';

export async function GET() {
  try {
    const news = await searchSVHCNews();
    // Return top 6 results
    return NextResponse.json({ ok: true, results: news.slice(0, 6) });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
