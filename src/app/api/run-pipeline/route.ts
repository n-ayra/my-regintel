import { NextRequest } from 'next/server';
import { runRegulationPipeline } from '@/lib/core/pipeline';
import { SVHC_CONFIG } from '@/lib/regulations/svhc/config';
import { buildSynthesisPrompt, buildVerificationPrompt } from '@/lib/regulations/svhc/processors';

export async function GET(req: NextRequest) {
  const result = await runRegulationPipeline({
    config: SVHC_CONFIG,
    synthesisPromptBuilder: buildSynthesisPrompt,
    verificationPromptBuilder: buildVerificationPrompt,
    maxSearchPerQuery: SVHC_CONFIG.maxArticles ?? 5
  });

  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
}
