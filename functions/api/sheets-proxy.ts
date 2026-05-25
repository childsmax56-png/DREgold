import { parseCSV, csvResponse } from './_csvParser';

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const sheetUrl = url.searchParams.get('url');

  if (!sheetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!sheetUrl.startsWith('https://docs.google.com/spreadsheets/')) {
    return new Response(JSON.stringify({ error: 'Only Google Sheets URLs are allowed' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res = await fetch(sheetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch sheet', status: res.status }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const text = await res.text();
    const rows = parseCSV(text);
    return csvResponse(rows);
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch or parse sheet' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
