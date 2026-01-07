import { NextResponse } from 'next/server';
import { supabase } from '@/lib/core/database';

export async function GET() {
  const { data, error } = await supabase
    .from('regulations')
    .select(`
      id,
      name,
      last_scanned_at,
      regulation_search_profiles (
        authority,
        search_queries,
        primary_sources
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}


export async function POST(req: Request) {
  const body = await req.json();
  const { name, authority, search_queries, primary_sources } = body;

  // Step 1: create regulation
  const { data: regData, error: regError } = await supabase
    .from('regulations')
    .insert([{ name, is_active: true }])
    .select()
    .single();

  if (regError) return NextResponse.json({ error: regError }, { status: 500 });

  // Step 2: create search profile (use ARRAY directly, no JSON.stringify)
  const { data: profileData, error: profileError } = await supabase
    .from('regulation_search_profiles')
    .insert([{
      regulation_id: regData.id,
      authority,
      search_queries: Array.isArray(search_queries) ? search_queries : [], // ensure array
      primary_sources: Array.isArray(primary_sources) ? primary_sources : null
    }]);

  if (profileError) return NextResponse.json({ error: profileError }, { status: 500 });

  return NextResponse.json({ regulation: regData, profile: profileData });
}

