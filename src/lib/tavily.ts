// lib/tavily.ts
export async function tavilySearch(query: string, maxResults = 6, days = 180) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      recency: days,
      include_answer: true
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Tavily search failed: ${res.status} ${txt}`);
  }

  return res.json();
}
