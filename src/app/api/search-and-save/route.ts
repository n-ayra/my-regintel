import { TavilyClient } from "tavily";
import { supabase } from "@/lib/supabaseClient";
import crypto from "crypto";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET() {
  const tavily = new TavilyClient({
    apiKey: process.env.TAVILY_API_KEY!,
  });

  // Regulation object (can later be dynamic)
  const regulation = {
    name: "SVHC Regulation",
    scope: "Chemical substances of very high concern (SVHC) under REACH",
    key_identifiers: [
      "SVHC",
      "Substances of Very High Concern",
      "REACH",
      "ECHA",
      "Candidate List",
    ],
    trigger_types: [
      "candidate list update",
      "restriction proposal",
      "substance added",
      "hazard classification change",
    ],
    review_conditions: ["new hazard data", "updated toxicology", "legal amendment"],
  };

  // 🔍 Search Tavily for anything SVHC-related in the last 6 months
  const search = await tavily.search({
    query: "SVHC REACH ECHA chemical update regulation enforcement",
    max_results: 10,
    include_answer: true,
  });

  const results = search.results;
  let storedCount = 0;

  for (const item of results) {
    const rawContent = item.content || "";
    const hash = crypto.createHash("sha256").update(rawContent).digest("hex");

    // Skip duplicates
    const existing = await supabase
      .from("articles")
      .select("id")
      .eq("content_hash", hash)
      .single();

    if (existing.data) continue;

    // Prepare article object
    const article = {
      title: item.title ?? "",
      url: item.url ?? "",
      published_date: new Date().toISOString(),
      content: rawContent,
    };

    const prompt = `
You are an expert regulation impact analyst.
You will receive:
1. regulation: a JSON object
2. article: an object with title, url, published_date, content

Your task:
Evaluate whether the article likely affects the regulation.

Rules:
- Match ONLY using the provided fields.
- Prioritize exact or close matches between article text and key_identifiers or trigger_types.
- Check if any review_conditions are fulfilled.

Steps:
1. Extract relevant entities.
2. Compare entities against key_identifiers.
3. Detect trigger events.
4. Determine if any review_conditions are satisfied.
5. Classify impact as: "high", "medium", "low", or "none".
6. Explain reasoning.

Strict output schema:
{
  "regulation": string,
  "impact_level": "high" | "medium" | "low" | "none",
  "matches": {
    "key_identifiers": [...],
    "trigger_events": [...],
    "review_conditions_met": [...]
  },
  "summary": string
}

Behave deterministically.

Analyze this:
${JSON.stringify({ regulation, article }, null, 2)}
`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4.1",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const resultText = aiResponse.choices[0].message?.content ?? "";
    let parsed;

    try {
      parsed = JSON.parse(resultText);
    } catch {
      parsed = {
        regulation: regulation.name,
        impact_level: "none",
        matches: {
          key_identifiers: [],
          trigger_events: [],
          review_conditions_met: [],
        },
        summary: "Model returned invalid JSON.",
      };
    }

    // Insert into Supabase
    await supabase.from("articles").upsert(
      [
        {
          article_name: article.title,
          regulation_name: regulation.name,
          content: article.content,
          summary: parsed.summary,
          type: parsed.impact_level, // store impact as type
          published_date: article.published_date,
          retrieved_date: new Date().toISOString(),
          source_link: article.url,
          content_hash: hash,

          // optional: save the raw JSON from analysis
          impact_json: parsed,
        },
      ],
      { onConflict: "content_hash" }
    );

    storedCount++;
  }

  return Response.json({ status: "completed", stored: storedCount });
}
