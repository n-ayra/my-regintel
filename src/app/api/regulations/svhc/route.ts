import { NextResponse } from "next/server";
import { runRegulationPipeline } from "@/lib/core/pipeline";
import { SVHC_CONFIG } from "@/lib/regulations/svhc/config";
import { svhcSynthesisPrompt, svhcVerificationPrompt } from "@/lib/regulations/svhc/processors";

export async function GET() {
  const result = await runRegulationPipeline({
    config: SVHC_CONFIG,
    synthesisPromptBuilder: svhcSynthesisPrompt,
    verificationPromptBuilder: svhcVerificationPrompt
  });

  return NextResponse.json(result);
}
