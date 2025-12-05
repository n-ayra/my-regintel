import type { TavilyArticle } from "@/lib/core/pipeline";
import { SVHC_CONFIG } from "./config";


// Build synthesis prompt for OpenAI (per article)
// processors.ts — updated buildSynthesisPrompt
export const buildSynthesisPrompt = (article: TavilyArticle, regulation: any) => {
  return `
You are an expert regulation impact analyst.
You will receive:
1. regulation: ${JSON.stringify(regulation, null, 2)}
2. article: ${JSON.stringify({
    title: article.title,
    url: article.url,
    published_date: article.published_date ?? null,
    content: article.content ?? article.snippet ?? "",
  }, null, 2)}

  Task:

  1) Extract a list of mentioned substances/entities that the article claims were ADDED
    to the regulation/candidate list.

    For each extracted item produce:
    {
      "name": "<text>",
      "cas": "<CAS if present or null>",
      "claimed_date": "<YYYY-MM-DD or null>",
      "quoted_phrase": "<short excerpt showing the claim>"
    }

  2) NUMBER-BASED INFERENCE RULE (Option B):

    If the article states that the total number of substances increased
    (e.g., "from 250 to 251", "now totals 251", "increased by 1")
    but no substance names are provided:

    - Compute the numeric difference (new_total - old_total).
    - For each inferred added substance, create a placeholder object:
      {
        "name": "unnamed substance",
        "cas": null,
        "claimed_date": "<article date if stated, else null>",
        "quoted_phrase": "<sentence containing the numeric change>"
      }
    - Add these placeholder items to the claims array.
    - Set explicit_addition_claim = true.

  3) Judge whether the article explicitly claims an addition (true/false)
    based on direct statements or number-based inference.

  4) Provide a short evidence summary and classify the impact level
    (high | medium | low | none).

  Output EXACT JSON only in the format:
  {
    "regulation": "${regulation.id}",
    "article_url": "${article.url}",
    "article_published_date": "${article.published_date ?? null}",
    "claims": [...],
    "explicit_addition_claim": true|false,
    "impact_level": "high" | "medium" | "low" | "none",
    "evidence_summary": "<short string>"
  }

`;
};


// Build verification prompt to compare article summaries with primary source
export const buildVerificationPrompt = (candidate: any, officialText: string) => `
You are an expert regulatory verification analyst.

Candidate extracted from article:
${JSON.stringify(candidate, null, 2)}

Official ECHA candidate list text:
${officialText}

For EACH item in candidate.claims, check whether the substance actually appears in the primary source.

Output ONLY a JSON array:
[
  {
    "name": "<claimed name>",
    "cas": "<string|null>",
    "claimed_date": "<YYYY-MM-DD|null>",
    "found_in_primary": true|false,
    "primary_mention_text": "<excerpt or empty>",
    "primary_list_date": "<YYYY-MM-DD|null>",
    "date_matches_claim": true|false,
    "reasoning": "<short reasoning>"
  }
]
`;




export const svhcSynthesisPrompt = (articles: TavilyArticle[]) => {
  // Combine all article prompts into one string
  return articles.map(article => buildSynthesisPrompt(article, SVHC_CONFIG)).join("\n\n");
};

// Wrap verification for pipeline: candidate + primary source
export const svhcVerificationPrompt = (candidate: any, primarySourceContent: string) => {
  return buildVerificationPrompt(candidate, primarySourceContent);
};
