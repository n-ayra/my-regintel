import { NextResponse } from 'next/server';
import { supabase } from '@/lib/core/database';
import { runRegulationPipeline } from '@/lib/core/pipeline';
import { buildSynthesisPrompt } from '@/lib/regulations/svhc/processors';

// ==========================================
// PIPELINE TRIGGER HANDLER
// ==========================================
export async function GET(req: Request) {
  const url = new URL(req.url);
  const regIdParam = url.searchParams.get('regulationId'); // e.g., "39" or "39,42"

  let query = supabase
    .from('regulations')
    .select(`
      id,
      name,
      regulation_search_profiles (
        authority,
        search_queries,
        primary_sources
      )
    `)
    .eq('is_active', true);

  // ✅ If regulationId is provided, filter by the IDs
  if (regIdParam) {
    const ids = regIdParam
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));
    if (ids.length > 0) query = query.in('id', ids);
  }

  const { data: regulations, error } = await query;

  if (error) {
    console.error('Error fetching regulations:', error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  if (!regulations || regulations.length === 0) {
    return NextResponse.json({ ok: true, message: 'No regulations found' });
  }

  const results: any[] = [];

  for (const reg of regulations) {
    // Wrap single object or null as array to avoid "not iterable" errors
    const profiles = Array.isArray(reg.regulation_search_profiles)
      ? reg.regulation_search_profiles
      : reg.regulation_search_profiles
      ? [reg.regulation_search_profiles]
      : [];

    if (profiles.length === 0) {
      console.warn(`Skipping regulation "${reg.name}" — no profiles`);
      continue;
    }

    for (const profile of profiles) {
      const searchQueries = Array.isArray(profile.search_queries) ? profile.search_queries : [];
      const primarySources = Array.isArray(profile.primary_sources) ? profile.primary_sources : [];

      const config = {
        id: String(reg.id), // convert number → string
        regulationName: reg.name,
        searchQueries,
        primarySourceUrl: primarySources[0] ?? undefined,
      };

      try {
        console.log(`Running pipeline for: ${reg.name}`);
        const res = await runRegulationPipeline({
          config,
          synthesisPromptBuilder: buildSynthesisPrompt,
          maxSearchPerQuery: 5,
        });
        results.push({ regulation: reg.name, result: res });
      } catch (err) {
        console.error(`Pipeline failed for regulation ${reg.name}:`, err);
        results.push({ regulation: reg.name, result: 'failed', error: String(err) });
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}
