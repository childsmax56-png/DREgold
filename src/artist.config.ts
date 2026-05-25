// ============================================================
//  ARTIST CONFIG — Dr. Dre / DREGOLD
// ============================================================

export const SITE_NAME = "DREGOLD";
export const SITE_DESCRIPTION = "The Best Dr. Dre Tracker In The World!";
export const SITE_URL = "https://dregold.pages.dev/";
export const OG_IMAGE_URL = "";

export function getArtistName(eraName?: string): string {
  return "Dr. Dre";
}

export const CUSTOM_IMAGES: Record<string, string> = {
  // "Era Name": "https://...",
};

// ORDER MATTERS — determines era sort order on the grid
export const ALBUM_RELEASE_DATES: Record<string, string> = {
  "N.W.A. And The Posse":                "11/06/1987",
  "Straight Outta Compton":              "01/25/1989",
  "100 Miles & Runnin'":                 "08/14/1990",
  "efiL4zaggiN":                         "05/28/1991",
  "The Chronic":                         "12/15/1992",
  "Helter Skelter":                      "??/??/????",
  "The Chronic II":                      "??/??/????",
  "2001":                                "11/16/1999",
  "Break Up To Make Up":                 "??/??/????",
  "N.W.A. Reunion":                      "??/??/????",
  "Detox [V1]":                          "??/??/????",
  "Detox [V2]":                          "??/??/????",
  "Detox [V3]":                          "??/??/????",
  "Planets [V1]":                        "??/??/????",
  "Detox [V4]":                          "??/??/????",
  "Detox [V5]":                          "??/??/????",
  "Compton":                             "08/07/2015",
  "Detox [V6]":                          "??/??/????",
  "JESUS IS KING: The Dr. Dre Version":  "??/??/????",
  "Detox [V7]":                          "??/??/????",
  "Missionary":                          "??/??/????",
  "LP4":                                 "??/??/????",
  "Planets [V2]":                        "??/??/????",
};

export const HIDDEN_ALBUMS: string[] = [];

export const ALBUM_DESCRIPTIONS: Record<string, string> = {};

export const CUSTOM_ALBUM_INFO: Record<string, string[]> = {};

export const ERA_MAPPINGS: Record<string, string> = {};

export const TAG_MAP: Record<string, string> = {
  "⭐": "Best Of",
  "🏆": "Grails",
  "🥇": "Wanted",
  "🏅": "Wanted",
  "✨": "Special",
  "💛": "By DREGOLD",
  "🗑️": "Worst Of",
  "🗑": "Worst Of",
  "🚮": "Unwanted",
  "🤖": "AI",
  "⁉️": "Lost Media",
  "⁉": "Lost Media",
  "❓": "Unknown",
};

export const CHATBOT_NAME = "DreBot";
export const CHATBOT_SUBTITLE = "Ask anything about Dr. Dre's music";
export const CHATBOT_AVATAR_URL = "";

export const TAG_TOOLTIP_MAP: Record<string, string> = {
  "Best Of":    "Some of the best leaks hosted on the tracker.",
  "Grails":     "The most wanted songs that have not yet leaked in full.",
  "Wanted":     "Songs that are wanted, but not as wanted as Grails.",
  "Special":    "Special songs worth highlighting but not Best Of level.",
  "Worst Of":   "Some of the worst leaks on the tracker.",
  "Unwanted":   "Songs we don't want to see leak in full.",
  "AI":         "Track contains AI vocals.",
  "Lost Media": "Currently lost, or no link to the media is known.",
  "By DREGOLD": "Leaks & songs added by the owner of the site.",
};
