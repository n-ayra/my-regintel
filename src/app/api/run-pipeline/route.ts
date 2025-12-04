// app/api/run-pipeline/route.ts (Next.js App Router)
import { NextRequest } from 'next/server';
import { runRegulationPipeline } from '@/lib/core/pipeline';

// Example config
const testConfig = {
  id: 'svhc_eu_reach',
  searchQueries: ['EU REACH SVHC regulation updates Annex XIV'],
  primarySourceUrl: 'https://example.com'
};

// Minimal prompt builders
const synthesisPromptBuilder = (articles: any[]) => `Summarize ${articles.length} articles`;
const verificationPromptBuilder = (candidate: any, officialText: string) => `Verify: ${candidate?.summary ?? ''}`;

export async function GET(req: NextRequest) {
  const result = await runRegulationPipeline({
    config: testConfig,
    synthesisPromptBuilder,
    verificationPromptBuilder
  });

  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
}
