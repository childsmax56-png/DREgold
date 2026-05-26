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
  // ── Main Projects tab (canonical names from a.ts) ────────────────
  "N.W.A. And The Posse":               "https://i.ibb.co/v6vtw0vc/Nwafirstalbum.jpg",
  "Straight Outta Compton":             "https://i.ibb.co/2YNM2mb0/NWAStraight-Outta-Compton600-Gb-2.jpg",
  "100 Miles & Runnin'":                "https://i.ibb.co/wZYY6NPK/download.jpg",
  "efiL4zaggiN":                        "https://i.ibb.co/0pVKTYcG/ab67616d0000b27377cf4557b2899021f216c8dd.jpg",
  "The Chronic":                        "https://i.ibb.co/4ZRkX8KH/Dr-Dre-The-Chronic.jpg",
  "Helter Skelter":                     "https://i.ibb.co/nNvsnsB9/Screenshot-2026-05-25-at-4-25-32-PM.png",
  "The Chronic II":                     "https://i.ibb.co/8LW3fn0M/lld2wwx6w40a1.png",
  "2001":                               "https://i.ibb.co/4ZNNbG7q/Dr-Dre-2001-1.jpg",
  "Break Up To Make Up":                "https://i.ibb.co/QFwmCK6L/dre-snoop-1993.webp",
  "N.W.A. Reunion":                     "https://i.ibb.co/bgwTKd8N/IMG-4156.jpg",
  "Detox [V1]":                         "https://i.ibb.co/jkSv1MkM/IMG-4159.png",
  "Detox [V2]":                         "https://i.ibb.co/fdCtV29F/IMG-4177.png",
  "Detox [V3]":                         "https://i.ibb.co/7d79N6gs/IMG-4186.png",
  "Planets [V1]":                       "https://i.ibb.co/9kPCFjb3/IMG-4188.png",
  "Detox [V4]":                         "https://i.ibb.co/6RkFj8pm/IMG-4189.png",
  "Detox [V5]":                         "https://i.ibb.co/xSd6hwSd/IMG-4198.jpg",
  "Compton":                            "https://i.ibb.co/Fp7tWm8/dr-dre-compton-vinyl-record-rapbay-cover-74961.jpg",
  "Detox [V6]":                         "https://i.ibb.co/ZzKBpkQ9/IMG-4203.png",
  "JESUS IS KING: The Dr. Dre Version": "https://i.ibb.co/QFS24gkV/IMG-4206.jpg",
  "Detox [V7]":                         "https://i.ibb.co/mr3y7dCk/IMG-4208.png",
  "Missionary":                         "https://i.ibb.co/pj6R4Qr6/IMG-4209.jpg",
  "LP4":                                "https://i.ibb.co/N6vkwn6X/IMG-4212.png",
  "Planets [V2]":                       "https://i.ibb.co/yct1HRHw/IMG-4213.jpg",

  // ── Production Projects tab (canonical names = header row first-line in production.ts) ──
  "Eazy-Duz-It":                                       "https://i.ibb.co/4nC7Dx4S/eazy-e-eazy-duz-it-cd-rapbay-97655.jpg",
  "No One Can Do It Better":                           "https://i.ibb.co/VWxFgK59/No-One-Can-Do-It-Better-big.jpg",
  "Doggystyle":                                        "https://i.ibb.co/0yJbk9JC/61k-Llr-QWt-QL-UF1000-1000-QL80.jpg",
  "Eargasm":                                           "https://i.ibb.co/svv3zVWk/270de453a3baf106fa65d840a94916bcc4ccf26b.jpg",
  "Murder Was the Case: The Soundtrack":               "https://i.ibb.co/27BCYC9P/Snoop-Dogg-Murder-Was-the-Case.jpg",
  "Dogg Food":                                         "https://i.ibb.co/1fsTzRrg/Dogg-Pound-Dogg-Food.jpg",
  "Dr. Dre Presents... The Aftermath":                 "https://i.ibb.co/1GvrGh7H/images.jpg",
  "Choices":                                           "https://i.ibb.co/dwHbpYQn/R-34157635-1748892235-9153.jpg",
  "Hands-On, Hands-Off":                               "https://i.ibb.co/gMb2gSLB/Screenshot-2026-05-25-at-4-29-55-PM.png",
  "Untitled Nowl Album":                               "https://i.ibb.co/TMCZCmGz/Screenshot-2026-05-25-at-4-30-42-PM.png",
  "Sexy Dancer":                                       "https://i.ibb.co/kVK2fqP3/Screenshot-2026-05-25-at-8-39-46-PM.png",
  "Untitled Serenade Album":                           "https://i.ibb.co/pvtcLnW0/Screenshot-2026-05-25-at-4-31-16-PM.png",
  "Untitled Sharief (AKA Killa Ben) Album":            "https://i.ibb.co/Nng36LRj/Screenshot-2026-05-25-at-4-31-25-PM.png",
  "Thy Kingdom Come":                                  "https://i.ibb.co/mFtSYxfc/R-25535383-1674342394-1423.jpg",
  "Who'z Who Rulez":                                   "https://i.ibb.co/ycvk2QwN/Screenshot-2026-05-25-at-4-31-55-PM.png",
  "The Album":                                         "https://i.ibb.co/mrczktJJ/Screenshot-2026-05-25-at-4-32-04-PM.png",
  "Untitled Sticky Fingaz Album":                      "https://i.ibb.co/zVGQkhxx/Screenshot-2026-05-25-at-4-33-04-PM.png",
  "Untitled The Last Emperor Album":                   "https://i.ibb.co/DHWd1pBr/Screenshot-2026-05-25-at-4-33-12-PM.png",
  "The Slim Shady LP":                                 "https://i.ibb.co/GQjdtgDQ/Eminem-The-Slim-Shady-LP-CD-cover.jpg",
  "Hitt's Big Skore":                                  "https://i.ibb.co/M5n9rtVH/IMG-4153.jpg",
  "Knoc's Landin'":                                    "https://i.ibb.co/spwpzKBV/IMG-4154.jpg",
  "Deuce":                                             "https://i.ibb.co/bRHgmD0j/IMG-4155.jpg",
  "The Marshall Mathers LP":                           "https://i.ibb.co/Mx3P9nJV/IMG-4157.jpg",
  "Restless":                                          "https://i.ibb.co/v6XL3FS8/IMG-4158.jpg",
  "Untitled Shaunta Album":                            "https://i.ibb.co/nqVGVcV3/IMG-4160.jpg",
  "Melt Down Music":                                   "https://i.ibb.co/6JRbGrV0/IMG-4161.jpg",
  "Untitled Ab-Liva Album":                            "https://i.ibb.co/Vc2Zwgc1/IMG-4162.jpg",
  "The Eminem Show":                                   "https://i.ibb.co/vCPM1NcN/IMG-4163.jpg",
  "Oh My God":                                         "https://i.ibb.co/whtZvHLy/IMG-4165.jpg",
  "Man vs. Machine":                                   "https://i.ibb.co/tPFG92v1/IMG-4166.jpg",
  "The Wash (The Original Motion Picture Soundtrack)": "https://i.ibb.co/8DxZ3HLN/IMG-4167.jpg",
  "Love For Sale":                                     "https://i.ibb.co/JRrL7994/IMG-4168.jpg",
  "Encore":                                            "https://i.ibb.co/JFBD8f6n/IMG-4169.jpg",
  "Get Rich Or Die Tryin'":                            "https://i.ibb.co/mCV3WSZm/IMG-4170.jpg",
  "The Massacre":                                      "https://i.ibb.co/4nMdvWf1/IMG-4171.png",
  "Untitled Antonio Album":                            "https://i.ibb.co/7tjV9mhq/IMG-4172.jpg",
  "The Documentary":                                   "https://i.ibb.co/d4QttHMm/IMG-4173.jpg",
  "Untitled Ne-Yo Album":                              "https://i.ibb.co/G4q5Kdsv/IMG-4174.jpg",
  "The Big Bang":                                      "https://i.ibb.co/Mk8yd3wF/IMG-4175.jpg",
  "Statlanta":                                         "https://i.ibb.co/hFLptvP1/IMG-4176.jpg",
  "Dr. Dre & Timbaland Present: Hayes":                "https://i.ibb.co/FbRr6FqJ/download-1.jpg",
  "The Soundtrack To My Life":                         "https://i.ibb.co/0pqTWkDb/IMG-4178.png",
  "Only Built 4 Cuban Linx... Pt. II":                 "https://i.ibb.co/4nKNJbVP/IMG-4179.png",
  "The Reformation":                                   "https://i.ibb.co/4gVVZnvr/IMG-4180.jpg",
  "Here I Am":                                         "https://i.ibb.co/r2pKdbPM/IMG-4181.jpg",
  "Untitled Dion Album":                               "https://i.ibb.co/s9gyPDs6/IMG-4182.jpg",
  "Blessed":                                           "https://i.ibb.co/bRdVKXnJ/IMG-4183.jpg",
  "Untitled Joell Ortiz Album":                        "https://i.ibb.co/C3Xc5MtL/IMG-4184.jpg",
  "King Mathers":                                      "https://i.ibb.co/C5zxFtpr/IMG-4185.png",
  "Relapse":                                           "https://i.ibb.co/Y4GTg0qz/Relapse-album.jpg",
  "Relapse 2":                                         "https://i.ibb.co/ZpHM1V0V/IMG-4191.png",
  "The R.E.D. Album":                                  "https://i.ibb.co/mCqCJ9Vz/IMG-4190.png",
  "S.O.O.N. (Something Out of Nothing)":               "https://i.ibb.co/3mw0PyBv/IMG-4892.jpg",
  "Recovery":                                          "https://i.ibb.co/dsFxBBHm/IMG-4193.jpg",
  "The Marshall Mathers LP 2":                         "https://i.ibb.co/xtSLz6y1/IMG-4194.jpg",
  "good kid, m.A.A.d city":                            "https://i.ibb.co/3YvW46Lb/good-kid-m-A-A-d-city.jpg",
  "Kingmaker":                                         "https://i.ibb.co/fdBpKBc8/IMG-4196.jpg",
  "Vehicle City":                                      "https://i.ibb.co/1fZ8ptcR/IMG-4197.png",
  "Untitled Mez Album":                                "https://i.ibb.co/ynJc7ybT/IMG-4199.png",
  "Oxnard":                                            "https://i.ibb.co/7Jh3thtj/IMG-4201.jpg",
  "Revival":                                           "https://i.ibb.co/HfJJpZMD/IMG-4202.jpg",
  "Untitled K.A.A.N. Album":                           "https://i.ibb.co/DdR2zJv/IMG-4204.jpg",
  "Music To Be Murdered By":                           "https://i.ibb.co/QFYrmqPH/IMG-4205.jpg",
  "Music To Be Murdered By: Side B":                   "https://i.ibb.co/S4v9LjzY/IMG-4207.jpg",
  "Casablanco":                                        "https://i.ibb.co/84mz53BD/IMG-4210.jpg",
  "Hot Water":                                         "https://i.ibb.co/fzvdJTFh/IMG-4211.png",
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
