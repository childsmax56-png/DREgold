import { parseCSV, csvResponse } from './_csvParser';

const VALID_TYPES = new Set(['Feature', 'Production', 'Single', 'Album Track', 'Other']);

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const csvUrl = `${url.origin}/data/released.csv`;

  const res = await fetch(csvUrl);
  if (!res.ok) return new Response('CSV not found', { status: 404 });

  const text = await res.text();
  const rows = parseCSV(text);

  const filtered = rows.filter(row => VALID_TYPES.has((row['Type'] || '').trim()));

  return csvResponse(filtered);
};
