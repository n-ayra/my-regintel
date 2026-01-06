import { NextResponse } from 'next/server';
import { supabase } from '@/lib/core/database';
import { runRegulationPipeline } from '@/lib/core/pipeline';
import { buildSynthesisPrompt } from '@/lib/regulations/svhc/processors';

// ==========================================
// PIPELINE TRIGGER HANDLER
// ==========================================
export async function GET() {
  
  // 1. Fetch active regulations and their associated search profiles
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
    console.error('Error fetching regulations:', error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  if (!regulations || regulations.length === 0) {
    return NextResponse.json({ ok: true, message: 'No regulations found' });
  }

  const results: any[] = [];

  // 2. Iterate through each regulation and run its specific pipeline
  for (const reg of regulations) {
    const profiles = reg.regulation_search_profiles ?? [];

    for (const profile of profiles) {
      // Map database profile to pipeline configuration
      const config = {
        id: reg.id,
        searchQueries: profile.search_queries,
        primarySourceUrl: profile.primary_sources?.[0] ?? undefined,
      };

      try {
        console.log(`Running pipeline for regulation: ${reg.name}`);
        
        // Execute the scanning and synthesis logic
        const res = await runRegulationPipeline({
          config,
          synthesisPromptBuilder: buildSynthesisPrompt,
          maxSearchPerQuery: 5, 
        });
        
        results.push({ regulation: reg.name, result: res });
      } catch (err) {
        console.error(`Pipeline failed for regulation ${reg.name}:`, err);
        results.push({ regulation: reg.name, result: 'failed', error: err });
      }
    }
  }

  return NextResponse.json({ ok: true, results });
}