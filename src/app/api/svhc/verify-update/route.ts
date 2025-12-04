import { NextResponse } from "next/server";
import { fetchECHAUpdates } from "@/lib/primarySource";
import { tavilySearch } from "@/lib/tavily";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET() {
  try {
    // 1. Fetch official SVHC candidate list
    const primary = await fetchECHAUpdates();

    // 2. Search for news via Tavily
    const newsResults = await tavilySearch("SVHC Candidate List update", 5, 180);
    const topArticle = newsResults.results?.[0] || null;

    if (!topArticle) {
      return NextResponse.json({ match: null });
    }

    // 3. AI verification & summary
    const prompt = `
You are an expert regulation impact analyst.
You will receive:
1. regulation: { name: "SVHC Candidate List" }
2. primary: ${JSON.stringify(primary, null, 2)}
3. article: ${JSON.stringify(topArticle, null, 2)}

Task:
- Confirm if the article matches the official update.
- Summarize in 2-3 sentences.
- Provide impact_level: high | medium | low | none
- Output strictly JSON like:
{ "summary": "...", "impact_level": "high", "matches": { key_identifiers: [], trigger_events: [], review_conditions_met: [] } }
`;

    const aiResp = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Analyze the article now." }
      ],
      temperature: 0
    });

    const raw = aiResp.choices[0].message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { summary: topArticle.content.slice(0, 300), impact_level: "none", matches: {} };
    }

    return NextResponse.json({
      match: topArticle,
      update: primary,
      summary: parsed.summary,
      impact_level: parsed.impact_level,
      matches: parsed.matches
    });

  } catch (err: any) {
    console.error("Error in /api/svhc/verify-update:", err);
    return NextResponse.json({ match: null });
  }
}
