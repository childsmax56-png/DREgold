import { parseCSV, csvResponse } from './_csvParser';

function parseSongName(raw: string): { name: string; extra: string | undefined } {
  const newline = raw.indexOf('\n');
  if (newline === -1) return { name: raw.trim(), extra: undefined };
  const name = raw.substring(0, newline).trim();
  const extra = raw.substring(newline).trim().replace(/^\n+/, '') || undefined;
  return { name, extra };
}

// Normalize era names from CSV header rows to canonical display names.
const HEADER_ERA_NORM: Record<string, string> = {
  "The Chronic II: A New World Odor (Poppa's Got A Brand New Funk)": 'The Chronic II',
  'N.W.A. Reunion Album': 'N.W.A. Reunion',
};

// Map song-row era names that differ from their header era canonical names.
const SONG_ERA_NORM: Record<string, string> = {
  'The Chronic II': 'The Chronic II',
  'N.W.A. Reunion': 'N.W.A. Reunion',
};

function mapHeaderEra(name: string): string {
  return HEADER_ERA_NORM[name] ?? name;
}

function mapSongEra(name: string): string {
  return SONG_ERA_NORM[name] ?? name;
}

// Map Portion column values to display category keys.
function portionToCategory(portion: string): string {
  switch (portion.trim()) {
    case 'OG File':
    case 'Stem Bounce':
      return 'OG File(s)';
    case 'Full':
      return 'Full';
    case 'Tagged':
      return 'Tagged';
    case 'Partial':
    case 'Beat Only':
    case 'Vocals Only':
      return 'Partial';
    case 'Snippet':
      return 'Snippet(s)';
    default:
      return 'Unavailable';
  }
}

export const onRequestGet: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);
    const csvUrl = `${url.origin}/data/unreleased-main.csv`;

    const res = await fetch(csvUrl);
    if (!res.ok) return new Response('CSV not found', { status: 404 });

    const text = await res.text();
    const rows = parseCSV(text);

    const NAME_KEY = 'Name';
    const eras: Record<string, any> = {};

    // First pass: collect canonical era names from header rows.
    // Header rows have '\n' in the Era field (file count summaries).
    // Stats rows also have '\n' but Name starts with digits followed by a space — skip those.
    const validEraNames = new Set<string>();

    // Eras that have song rows but no header row in the CSV — seed them manually.
    const HEADERLESS_ERAS: string[] = [
      "100 Miles & Runnin'",
      '2001',
    ];
    for (const name of HEADERLESS_ERAS) {
      validEraNames.add(name);
      eras[name] = {
        name,
        data: {
          'OG File(s)': [],
          'Full': [],
          'Tagged': [],
          'Partial': [],
          'Snippet(s)': [],
          'Unavailable': [],
        },
      };
    }

    for (const row of rows) {
      const eraField = row['Era'] ?? '';
      if (!eraField.includes('\n')) continue;
      const { name: rawName } = parseSongName(row[NAME_KEY] ?? '');
      if (rawName && !/^\d+\s/.test(rawName)) {
        validEraNames.add(mapHeaderEra(rawName));
      }
    }

    // Second pass: build eras and songs.
    for (const row of rows) {
      const eraField = row['Era'] ?? '';
      const nameField = row[NAME_KEY] ?? '';

      if (eraField.includes('\n')) {
        // Era header row
        const { name: rawName, extra } = parseSongName(nameField);
        if (!rawName || /^\d+\s/.test(rawName)) continue;
        const eraName = mapHeaderEra(rawName);
        if (!validEraNames.has(eraName)) continue;

        eras[eraName] = {
          name: eraName,
          extra: extra ?? undefined,
          timeline: row['Notes']?.trim() || undefined,
          fileInfo: eraField.split('\n').map((l: string) => l.trim()).filter(Boolean),
          data: {
            'OG File(s)': [],
            'Full': [],
            'Tagged': [],
            'Partial': [],
            'Snippet(s)': [],
            'Unavailable': [],
          },
        };
      } else if (eraField) {
        // Song row — normalize era name, then look up in valid eras
        const rawEra = eraField.trim();
        const eraName = mapSongEra(rawEra);
        if (!validEraNames.has(eraName)) continue;

        if (!eras[eraName]) {
          eras[eraName] = {
            name: eraName,
            data: {
              'OG File(s)': [],
              'Full': [],
              'Tagged': [],
              'Partial': [],
              'Snippet(s)': [],
              'Unavailable': [],
            },
          };
        }

        const { name, extra } = parseSongName(nameField);
        const links = (row['Link(s)'] ?? '').split('\n').map((l: string) => l.trim()).filter(Boolean);
        const category = portionToCategory(row['Portion'] ?? '');

        eras[eraName].data[category].push({
          name,
          extra: extra ?? undefined,
          description: row['Notes'] ?? '',
          track_length: row['Track Length'] ?? '',
          file_date: row['Origin'] ?? '',
          leak_date: row['Leak\nDate'] ?? row['Leak Date'] ?? '',
          available_length: row['Portion'] ?? '',
          quality: row['Quality'] ?? '',
          url: links[0] ?? '',
          urls: links,
        });
      }
    }

    const ERA_ORDER = [
      'N.W.A. And The Posse',
      'Straight Outta Compton',
      "100 Miles & Runnin'",
      'efiL4zaggiN',
      'The Chronic',
      'Helter Skelter',
      'The Chronic II',
      '2001',
      'Break Up To Make Up',
      'N.W.A. Reunion',
      'Detox [V1]',
      'Detox [V2]',
      'Detox [V3]',
      'Planets [V1]',
      'Detox [V4]',
      'Detox [V5]',
      'Compton',
      'Detox [V6]',
      'JESUS IS KING: The Dr. Dre Version',
      'Detox [V7]',
      'Missionary',
      'LP4',
      'Planets [V2]',
    ];

    // Build eras as an ordered array to avoid JS integer-key reordering
    // (plain objects sort numeric-like keys like "2001" to the front)
    const orderedErasArray: any[] = [];
    const seen = new Set<string>();
    for (const name of ERA_ORDER) {
      if (eras[name]) { orderedErasArray.push(eras[name]); seen.add(name); }
    }
    // Append any eras from the CSV not in the order list
    for (const name of Object.keys(eras)) {
      if (!seen.has(name)) orderedErasArray.push(eras[name]);
    }

    const trackerData = {
      name: 'DREGOLD',
      tabs: ['eras'],
      current_tab: 'eras',
      eras: orderedErasArray,
    };

    return csvResponse(trackerData);
  } catch (err) {
    return new Response('Failed to build tracker data', { status: 500 });
  }
};
