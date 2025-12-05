import { NextResponse } from 'next/server';
import { supabase } from '@/lib/core/database';

export async function GET() {
  const { data, error } = await supabase
    .from('verified_updates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Verified updates API error:', error);
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data || []);
}
