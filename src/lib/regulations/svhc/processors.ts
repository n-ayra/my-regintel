import type { TavilyArticle } from "@/lib/core/pipeline";
import { SVHC_CONFIG } from "./config";


// Build synthesis prompt for OpenAI (per article)
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

Your task:
Evaluate whether the article likely affects the regulation.
Rules:
- Match ONLY using the provided fields.
- Prioritize exact or close matches between article text and:
  - regulation.key_identifiers
  - regulation.trigger_types
- Check if any regulation.review_conditions are fulfilled.

Steps to follow:
1. Extract relevant entities from the article (substances, chemicals, polymers, CAS, legal actions).
2. Compare extracted entities against regulation.key_identifiers.
3. Detect trigger events by matching article phrases against regulation.trigger_types.
4. Determine if any review_conditions are satisfied.
5. Classify impact as:
   - "high" (direct change to identifiers or clear trigger)
   - "medium" (related topic but unclear whether identifiers are affected)
   - "low" (weak relevance but part of the same domain)
   - "none" (no overlap found)
6. Explain your reasoning in a structured manner.

Output JSON with fields:
{
  "regulation": "${regulation.id}",
  "impact_level": "high" | "medium" | "low" | "none",
  "matches": {
    "key_identifiers": [...],
    "trigger_events": [...],
    "review_conditions_met": [...]
  },
  "summary": string
}
Behave deterministically and follow the schema strictly.
`;
};

// Build verification prompt to compare article summaries with primary source
export const buildVerificationPrompt = (articleSummaries: any[], primarySourceContent: string, regulation: any) => {
  return `
You are an expert regulation impact analyst.
Compare the following article summaries with the primary source content of the regulation.
Determine whether each article indicates an actual regulatory update.

Regulation: ${JSON.stringify(regulation, null, 2)}

Articles:
${JSON.stringify(articleSummaries, null, 2)}

Primary source content:
${primarySourceContent}

Output JSON array for each article with:
- url
- update_detected: true/false
- reasoning: short explanation
- impact_level: "high" | "medium" | "low" | "none"
`;
};


export const svhcSynthesisPrompt = (articles: TavilyArticle[]) => {
  // Combine all article prompts into one string
  return articles.map(article => buildSynthesisPrompt(article, SVHC_CONFIG)).join("\n\n");
};

// Wrap verification for pipeline: candidate + primary source
export const svhcVerificationPrompt = (candidate: any, primarySourceContent: string) => {
  return buildVerificationPrompt([candidate], primarySourceContent, SVHC_CONFIG);
};