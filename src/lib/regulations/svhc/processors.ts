import type { TavilyArticle } from "@/lib/core/pipeline";


export const buildSynthesisPrompt = (article: TavilyArticle, regulation: any) => {
  return `
You are an expert regulatory intelligence processor. Your task is to extract structured information from the provided news article text about a regulation.

The regulation being analyzed is: "${regulation.regulation_name}"

Article Text:
--- START ARTICLE TEXT ---
Title: ${article.title}
URL: ${article.url}
Published Date: ${article.published_date ?? 'N/A'}
Content: ${article.content ?? article.snippet ?? "No content available."}
--- END ARTICLE TEXT ---

Task:
Read the Article Text and determine three things:
1. **update_type**: The nature of the change (choose only one: "addition", "revision", "announcement", or "guidance").
2. **event_month**: The month when the change occurred, in YYYY-MM format. If unknown, use "unspecified".
3. **change_scope**: The magnitude or type of change. Examples:
   - Explicit count (e.g., "count_1", "count_3")
   - Procedural/process changes ("process")
   - Timeline/schedule changes ("timeline")
   - Unknown → "unspecified"
4. **update_summary**: A 1-2 sentence description of **what changed** according to this article.

Constraints:
* **Do NOT** include evidence, verification, justification, or citations.
* Output must be short; vague is OK.
* **Do not use keywords like "REACH", "SVHC" etc. for anchors.**

Output EXACT JSON ONLY in the format:
{
  "update_type": "addition | revision | announcement | guidance",
  "event_month": "YYYY-MM | unspecified",
  "change_scope": "count_1 | count_3 | process | timeline | unspecified",
  "update_summary": "Short description of what changed"
}
`;
};
