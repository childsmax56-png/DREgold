import { parseCSV, csvResponse } from './_csvParser';

function parseSongName(raw: string): { name: string; extra: string | undefined } {
  const newline = raw.indexOf('\n');
  if (newline === -1) return { name: raw.trim(), extra: undefined };
  const name = raw.substring(0, newline).trim();
  const extra = raw.substring(newline).trim().replace(/^\n+/, '') || undefined;
  return { name, extra };
}

// Map short song-row era names to their canonical header-row names.
const SONG_ERA_NORM: Record<string, string> = {
  'Murder Was The Case':          'Murder Was the Case: The Soundtrack',
  'The Aftermath':                'Dr. Dre Presents... The Aftermath',
  'Untitled Sharief Album':       'Untitled Sharief (AKA Killa Ben) Album',
  "Who's Who Rulez":              "Who'z Who Rulez",
  'Name & Address':               'Name and Address',
  'The Wash':                     'The Wash (The Original Motion Picture Soundtrack)',
  'D&T Present: Hayes':           'Dr. Dre & Timbaland Present: Hayes',
  'Only Built 4 Cuban Linx Pt. 2':'Only Built 4 Cuban Linx... Pt. II',
  'Untitled Marsha Album':        'Untitled Marsha Ambrosius Album',
  'S.O.O.N.':                    'S.O.O.N. (Something Out of Nothing)',
  'Side B':                       'Music To Be Murdered By: Side B',
};

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
    const csvUrl = `${url.origin}/data/unreleased-production.csv`;

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
    for (const row of rows) {
      const eraField = row['Era'] ?? '';
      if (!eraField.includes('\n')) continue;
      const { name: rawName } = parseSongName(row[NAME_KEY] ?? '');
      if (rawName && !/^\d+\s/.test(rawName)) {
        validEraNames.add(rawName);
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
        if (!validEraNames.has(rawName)) continue;

        eras[rawName] = {
          name: rawName,
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
        // Song row — normalise short era aliases to canonical header names
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
      'Eazy-Duz-It',
      'No One Can Do It Better',
      'Doggystyle',
      'Eargasm',
      'Murder Was the Case: The Soundtrack',
      'Dogg Food',
      'Dr. Dre Presents... The Aftermath',
      'Choices',
      'Hands-On, Hands-Off',
      'Untitled Nowl Album',
      'Sexy Dancer',
      'Untitled Serenade Album',
      'Untitled Sharief (AKA Killa Ben) Album',
      'Thy Kingdom Come',
      "Who'z Who Rulez",
      'The Album',
      'Untitled The Last Emperor Album',
      'Untitled Sticky Fingaz Album',
      'The Slim Shady LP',
      "Hitt's Big Skore",
      "Knoc's Landin'",
      'Deuce',
      'The Marshall Mathers LP',
      'Restless',
      'Untitled Shaunta Album',
      'Melt Down Music',
      'Untitled Ab-Liva Album',
      'The Eminem Show',
      'Truthfully Speaking',
      'Oh My God',
      'Standing Small',
      'Man vs. Machine',
      'Name and Address',
      'The Wash (The Original Motion Picture Soundtrack)',
      'Love For Sale',
      'Encore',
      "Get Rich Or Die Tryin'",
      'The Massacre',
      'Untitled Antonio Album',
      'The Documentary',
      'Untitled Ne-Yo Album',
      'The Big Bang',
      'Statlanta',
      'Dr. Dre & Timbaland Present: Hayes',
      'The Soundtrack To My Life',
      'Only Built 4 Cuban Linx... Pt. II',
      'The Reformation',
      'Here I Am',
      'Untitled Marsha Ambrosius Album',
      'Untitled Dion Album',
      'Blessed',
      'Untitled Joell Ortiz Album',
      'King Mathers',
      'Voices Through Hot Vessels',
      'Relapse',
      'Relapse 2',
      'The R.E.D. Album',
      'S.O.O.N. (Something Out of Nothing)',
      'Recovery',
      'The Marshall Mathers LP 2',
      'good kid, m.A.A.d city',
      'Kingmaker',
      'Vehicle City',
      'Untitled Mez Album',
      'Oxnard',
      'Revival',
      'Untitled K.A.A.N. Album',
      'Music To Be Murdered By',
      'Music To Be Murdered By: Side B',
      'Casablanco',
      'Hot Water',
    ];

    const orderedEras: Record<string, any> = {};
    for (const name of ERA_ORDER) {
      if (eras[name]) orderedEras[name] = eras[name];
    }
    // Append any eras from the CSV not in the order list
    for (const name of Object.keys(eras)) {
      if (!orderedEras[name]) orderedEras[name] = eras[name];
    }

    const trackerData = {
      name: 'DREGOLD',
      tabs: ['eras'],
      current_tab: 'eras',
      eras: orderedEras,
    };

    return csvResponse(trackerData);
  } catch (err) {
    return new Response('Failed to build tracker data', { status: 500 });
  }
};
