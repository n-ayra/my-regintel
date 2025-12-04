// app/api/scrape-primary/route.ts
import { NextResponse } from 'next/server';
import { fetchECHAUpdates } from '@/lib/primarySource'; 

export async function GET() {
  try {
    const primary = await fetchECHAUpdates();
    return NextResponse.json({ ok: true, primary });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
