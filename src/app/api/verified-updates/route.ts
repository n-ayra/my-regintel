import { NextResponse } from 'next/server';
import { supabase } from '@/lib/core/database';

export async function GET() {
  const { data, error } = await supabase
    .from('latest_verified_updates')
    .select(`
    regulation_id,
    deduced_published_date,
    verified_updates:verified_update_id(*)
    `)
    .order('deduced_published_date', { ascending: false });

  if (error) {
    console.error('Verified updates API error:', error);
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data || []);
}
