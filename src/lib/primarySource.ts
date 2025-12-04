// lib/primarySource.ts
import { load as loadCheerio } from 'cheerio';

export async function fetchECHAUpdates() {
  const url = 'https://echa.europa.eu/candidate-list-table';

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
      console.warn(`ECHA fetch returned status ${res.status}`);
      html = ''; // fallback to empty string
    } else {
      html = await res.text();
    }
  } catch (err) {
    console.warn('Error fetching ECHA page:', err);
    html = '';
  }

  const $ = loadCheerio(html || '');

  // Try to locate the table rows in the candidate list table
  const rows = $('table.candidate-list-table tbody tr');

  const substances: string[] = [];
  if (rows.length > 0) {
    rows.each((i, tr) => {
      const nameCell = $(tr).find('td').first();
      const nameText = nameCell.text().trim();
      if (nameText) substances.push(nameText);
    });
  }

  // Try to find page-level "last updated" text
  let updatedDate: Date | null = null;
  const maybeText = html || $('body').text();
  const dateMatch = maybeText.match(/Last updated[:\s]*([0-9]{1,2}\s+\w+\s+[0-9]{4})/i);
  if (dateMatch) updatedDate = new Date(dateMatch[1]);

  return {
    url,
    updatedDate: updatedDate ? updatedDate.toISOString() : null,
    substances
  };
}
