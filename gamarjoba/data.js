/* Gamarjoba! — curriculum data
 * Plain (non-module) script: assigns window.CURRICULUM.
 * Teaches Georgian (ქართული, Mkhedruli script) to English speakers.
 * Romanization: apostrophes mark ejectives (k', p', t', q', ts', ch').
 * No imports/exports — safe over file:// and http://.
 */

window.CURRICULUM = {

  /* ------------------------------------------------------------------ *
   * Shared UI strings — ALL learner-facing Georgian lives in this file
   * so it can be reviewed in one place.
   * ------------------------------------------------------------------ */
  strings: {
    excellent:        "შესანიშნავია!",   // "Excellent!" (finish screen)
    alphabet:         "ანბანი",          // "alphabet"
    georgianAlphabet: "ქართული ანბანი",  // "the Georgian alphabet"
    practice:         "პრაქტიკა",        // "practice"
    letters:          "ანბანი",          // Letters path title (same word, path context)
    reading:          "კითხვა",          // "reading" (Reading path title)
    /* v3 additions — retention screens (display copy, not spoken) */
    treasures:        "ჩემი საგანძური",  // "my treasures" (rewards screen title)
    dictionary:       "ჩემი ლექსიკონი",  // "my dictionary" (collected words)
    wordOfDay:        "დღის სიტყვა",     // "word of the day"
    /* v4 additions — display copy only, not spoken (no clips → stays a
     * plain, non-tappable kaSpan per the universal tap-to-hear policy) */
    readingSprint:    "კითხვის სეირნობა", // "reading stroll" — calm, no racing connotation
    games:            "თამაშები"         // "games"
  },

  /* ------------------------------------------------------------------ *
   * The full 33-letter Mkhedruli alphabet, in 6 teachable groups.
   * ------------------------------------------------------------------ */
  alphabet: [
    {
      id: "group-1",
      title: "First sounds",
      letters: [
        { ka: "ა", name: "ani",  translit: "a", ipa: "ɑ",
          example: { ka: "ალუბალი", translit: "alubali", en: "cherry" } },
        { ka: "ბ", name: "bani", translit: "b", ipa: "b",
          example: { ka: "ბანანი", translit: "banani", en: "banana" } },
        { ka: "გ", name: "gani", translit: "g", ipa: "ɡ",
          example: { ka: "გამარჯობა", translit: "gamarjoba", en: "hello" } },
        { ka: "დ", name: "doni", translit: "d", ipa: "d",
          example: { ka: "დედა", translit: "deda", en: "mother" } },
        { ka: "ე", name: "eni",  translit: "e", ipa: "ɛ",
          example: { ka: "ენა", translit: "ena", en: "language, tongue" } },
        { ka: "ვ", name: "vini", translit: "v", ipa: "v",
          example: { ka: "ვაშლი", translit: "vashli", en: "apple" } }
      ]
    },
    {
      id: "group-2",
      title: "Everyday letters",
      letters: [
        { ka: "ზ", name: "zeni", translit: "z", ipa: "z",
          example: { ka: "ზღვა", translit: "zghva", en: "sea" } },
        { ka: "თ", name: "tani", translit: "t", ipa: "tʰ",
          example: { ka: "თევზი", translit: "tevzi", en: "fish" } },
        { ka: "ი", name: "ini",  translit: "i", ipa: "i",
          example: { ka: "ია", translit: "ia", en: "violet (flower)" } },
        { ka: "კ", name: "k'ani", translit: "k'", ipa: "kʼ",
          example: { ka: "კატა", translit: "k'at'a", en: "cat" } },
        { ka: "ლ", name: "lasi", translit: "l", ipa: "l",
          example: { ka: "ლომი", translit: "lomi", en: "lion" } },
        { ka: "მ", name: "mani", translit: "m", ipa: "m",
          example: { ka: "მამა", translit: "mama", en: "father" } }
      ]
    },
    {
      id: "group-3",
      title: "Middle of the alphabet",
      letters: [
        { ka: "ნ", name: "nari", translit: "n", ipa: "n",
          example: { ka: "ნავი", translit: "navi", en: "boat" } },
        { ka: "ო", name: "oni",  translit: "o", ipa: "ɔ",
          example: { ka: "ოთახი", translit: "otakhi", en: "room" } },
        { ka: "პ", name: "p'ari", translit: "p'", ipa: "pʼ",
          example: { ka: "პური", translit: "p'uri", en: "bread" } },
        { ka: "ჟ", name: "zhani", translit: "zh", ipa: "ʒ",
          example: { ka: "ჟირაფი", translit: "zhirapi", en: "giraffe" } },
        { ka: "რ", name: "rae",  translit: "r", ipa: "r",
          example: { ka: "რძე", translit: "rdze", en: "milk" } },
        { ka: "ს", name: "sani", translit: "s", ipa: "s",
          example: { ka: "სახლი", translit: "sakhli", en: "house" } }
      ]
    },
    {
      id: "group-4",
      title: "Two p's and two k's",
      letters: [
        { ka: "ტ", name: "t'ari", translit: "t'", ipa: "tʼ",
          example: { ka: "ტბა", translit: "t'ba", en: "lake" } },
        { ka: "უ", name: "uni",  translit: "u", ipa: "u",
          example: { ka: "უთო", translit: "uto", en: "clothes iron" } },
        { ka: "ფ", name: "pari", translit: "p", ipa: "pʰ",
          example: { ka: "ფული", translit: "puli", en: "money" } },
        { ka: "ქ", name: "kani", translit: "k", ipa: "kʰ",
          example: { ka: "ქალაქი", translit: "kalaki", en: "city" } },
        { ka: "ღ", name: "ghani", translit: "gh", ipa: "ɣ",
          example: { ka: "ღამე", translit: "ghame", en: "night" } }
      ]
    },
    {
      id: "group-5",
      title: "Hissing, buzzing & one deep throat sound",
      letters: [
        { ka: "ყ", name: "q'ari", translit: "q'", ipa: "qʼ",
          example: { ka: "ყვავილი", translit: "q'vavili", en: "flower" } },
        { ka: "შ", name: "shini", translit: "sh", ipa: "ʃ",
          example: { ka: "შაქარი", translit: "shakari", en: "sugar" } },
        { ka: "ჩ", name: "chini", translit: "ch", ipa: "t͡ʃʰ",
          example: { ka: "ჩაი", translit: "chai", en: "tea" } },
        { ka: "ც", name: "tsani", translit: "ts", ipa: "t͡sʰ",
          example: { ka: "ცა", translit: "tsa", en: "sky" } },
        { ka: "ძ", name: "dzili", translit: "dz", ipa: "d͡z",
          example: { ka: "ძაღლი", translit: "dzaghli", en: "dog" } }
      ]
    },
    {
      id: "group-6",
      title: "The last five",
      letters: [
        { ka: "წ", name: "ts'ili", translit: "ts'", ipa: "t͡sʼ",
          example: { ka: "წყალი", translit: "ts'q'ali", en: "water" } },
        { ka: "ჭ", name: "ch'ari", translit: "ch'", ipa: "t͡ʃʼ",
          example: { ka: "ჭიქა", translit: "ch'ika", en: "glass, cup" } },
        { ka: "ხ", name: "khani", translit: "kh", ipa: "x",
          example: { ka: "ხე", translit: "khe", en: "tree" } },
        { ka: "ჯ", name: "jani", translit: "j", ipa: "d͡ʒ",
          example: { ka: "ჯიბე", translit: "jibe", en: "pocket" } },
        { ka: "ჰ", name: "hae",  translit: "h", ipa: "h",
          example: { ka: "ჰაერი", translit: "haeri", en: "air" } }
      ]
    }
  ],

  /* ------------------------------------------------------------------ *
   * Units → lessons. Lesson items reference vocab ids below.
   * ------------------------------------------------------------------ */
  units: [
    {
      id: "greetings",
      title: "Greetings & Basics",
      emoji: "👋",
      description: "Say hello, thank you, yes and no — your first Georgian words.",
      lessons: [
        { id: "greetings-1", title: "Hello & goodbye",
          items: ["gamarjoba", "nakhvamdis", "dila_mshvidobisa", "ghame_mshvidobisa"] },
        { id: "greetings-2", title: "Being polite",
          items: ["madloba", "gmadlobt", "gtkhovt", "bodishi"] },
        { id: "greetings-3", title: "Yes, no & how are you?",
          items: ["ki", "ara", "rogor_khar", "kargad"] }
      ]
    },
    {
      id: "family",
      title: "People & Family",
      emoji: "👨‍👩‍👧‍👦",
      description: "Mother, father, friends — the people around you.",
      lessons: [
        { id: "family-1", title: "Parents & grandparents",
          items: ["deda", "mama", "bebia", "babua"] },
        { id: "family-2", title: "Brothers, sisters & kids",
          items: ["da", "dzma", "shvili", "bavshvi"] },
        { id: "family-3", title: "Family & friends",
          items: ["ojakhi", "megobari", "katsi", "kali"] }
      ]
    },
    {
      id: "numbers",
      title: "Numbers 1–10",
      emoji: "🔢",
      description: "Count from one to ten in Georgian.",
      lessons: [
        { id: "numbers-1", title: "One, two, three",
          items: ["erti", "ori", "sami"] },
        { id: "numbers-2", title: "Four to seven",
          items: ["otkhi", "khuti", "ekvsi", "shvidi"] },
        { id: "numbers-3", title: "Eight, nine, ten... and zero",
          items: ["rva", "tskhra", "ati", "nuli"] }
      ]
    },
    {
      id: "food",
      title: "Food & Drink",
      emoji: "🥟",
      description: "Khachapuri, khinkali and everything on the supra table.",
      lessons: [
        { id: "food-1", title: "At the table",
          items: ["puri", "qveli", "kvertskhi", "rdze", "shakari"] },
        { id: "food-2", title: "Georgian favorites",
          items: ["khachapuri", "khinkali", "vashli", "khili"] },
        { id: "food-3", title: "Drinks",
          items: ["tsqali", "chai", "qava", "tsveni"] }
      ]
    },
    {
      id: "colors",
      title: "Colors",
      emoji: "🎨",
      description: "Red, white and every color of the rainbow.",
      lessons: [
        { id: "colors-1", title: "First colors",
          items: ["peri", "tsiteli", "tetri", "shavi"] },
        { id: "colors-2", title: "Rainbow colors",
          items: ["lurji", "mtsvane", "qviteli", "narinjisperi"] },
        { id: "colors-3", title: "More colors",
          items: ["iisperi", "vardisperi", "qavisperi", "natsrisperi"] }
      ]
    },
    {
      id: "animals",
      title: "Animals",
      emoji: "🐾",
      description: "Pets, farm animals and the wild ones in the mountains.",
      lessons: [
        { id: "animals-1", title: "Pets & friends",
          items: ["kata", "dzaghli", "tskheni", "kurdgheli"] },
        { id: "animals-2", title: "On the farm",
          items: ["dzrokha", "ghori", "tkha", "tskhvari"] },
        { id: "animals-3", title: "In the wild",
          items: ["tskhoveli", "prinveli", "tevzi", "datvi", "mgeli"] }
      ]
    },
    {
      id: "town",
      title: "Around Town",
      emoji: "🏙️",
      description: "Find your way around Tbilisi — streets, shops and mountains.",
      lessons: [
        { id: "town-1", title: "The city",
          items: ["kalaki", "tbilisi", "kucha", "sakhli", "mta"] },
        { id: "town-2", title: "Shops & food places",
          items: ["maghazia", "bazari", "restorani", "sastumro"] },
        { id: "town-3", title: "Places to visit",
          items: ["skola", "eklesia", "muzeumi", "parki", "avtobusi"] }
      ]
    },
    {
      id: "phrases",
      title: "Useful Phrases",
      emoji: "💬",
      description: "Real sentences for real conversations.",
      lessons: [
        { id: "phrases-1", title: "Introducing yourself",
          items: ["me_mkvia", "me_var", "ukatsravad", "kargi"] },
        { id: "phrases-2", title: "Getting around",
          items: ["sad_aris", "ramdeni_ghirs", "minda", "damekhmaret"] },
        { id: "phrases-3", title: "When you're stuck",
          items: ["ar_vitsi", "ar_mesmis", "inglisurad", "kartuli"] }
      ]
    },

    /* -------------------- v3 — Sakartvelo release: units 9–16 --------------------
     * Appended only; existing unit/lesson/vocab ids above are untouched. */
    {
      id: "feelings",
      title: "Feelings & Needs",
      emoji: "😊",
      description: "Say how you feel — the words that get you help and hugs.",
      lessons: [
        { id: "feelings-1", title: "Happy & sad",
          items: ["bednieri", "motsqenili", "daghlili", "mikharia"] },
        { id: "feelings-2", title: "Hungry & cold",
          items: ["mshia", "mtsquria", "mtsiva", "mtskhela"] },
        { id: "feelings-3", title: "I like it!",
          items: ["momtsons", "miqvarkhar", "mchirdeba", "tsudad_var"] }
      ]
    },
    /* question words come BEFORE the units whose phrases embed them
     * (რომელი საათია / ეს რა ღირს / სად არის ტუალეტი) — usefulness-first;
     * unit/lesson ids are unchanged, so existing saves keep working */
    {
      id: "smalltalk",
      title: "Questions & Small Talk",
      emoji: "💭",
      description: "Who, what, where — and making friends.",
      lessons: [
        { id: "smalltalk-1", title: "Question words",
          items: ["ra", "vin", "sad", "rodis"] },
        { id: "smalltalk-2", title: "More questions",
          items: ["ratom", "rogor", "es_ra_aris", "saidan_khart"] },
        { id: "smalltalk-3", title: "Making friends",
          items: ["sasiamovnoa", "mobrdzandit", "shekhvedramde", "ra_tkma_unda"] }
      ]
    },
    {
      id: "time",
      title: "Time & Days",
      emoji: "🕐",
      description: "Today, tomorrow and the days of the week.",
      lessons: [
        { id: "time-1", title: "Today & tomorrow",
          items: ["dghes", "khval", "gushin", "akhla", "mere"] },
        { id: "time-2", title: "Parts of the day",
          items: ["dghe", "dila", "saghamo", "saati"] },
        { id: "time-3", title: "Days of the week",
          items: ["orshabati", "shabati", "kvira", "romeli_saatia"] }
      ]
    },
    {
      id: "weather",
      title: "Weather & Seasons",
      emoji: "⛅",
      description: "Sun, snow and the four seasons.",
      lessons: [
        { id: "weather-1", title: "Sun & rain",
          items: ["amindi", "mze", "tsvima", "tovli"] },
        { id: "weather-2", title: "Hot & cold",
          items: ["kari", "tsiva", "tskhela", "kargi_amindia"] },
        { id: "weather-3", title: "The seasons",
          items: ["gazapkhuli", "zapkhuli", "shemodgoma", "zamtari"] }
      ]
    },
    {
      id: "restaurant",
      title: "At the Restaurant",
      emoji: "🍽️",
      description: "Order like a local at the supra.",
      lessons: [
        { id: "restaurant-1", title: "At the table",
          items: ["meniu", "magida", "opitsianti", "salati"] },
        { id: "restaurant-2", title: "Yum!",
          items: ["supi", "khortsi", "naqini", "limonati", "gemrielia"] },
        { id: "restaurant-3", title: "Ordering",
          items: ["gemrielad_miirtvit", "erti_khinkali_gtkhovt", "angarishi_gtkhovt", "gaumarjos"] }
      ]
    },
    {
      id: "shopping",
      title: "Shopping & Money",
      emoji: "🛍️",
      description: "Lari, bargains and “do you have…?”",
      lessons: [
        { id: "shopping-1", title: "Money",
          items: ["puli", "lari", "dzviri", "iapi"] },
        { id: "shopping-2", title: "Big & small",
          items: ["didi", "patara", "akhali", "sachukari"] },
        { id: "shopping-3", title: "At the shop",
          items: ["tansatsmeli", "pekhsatsmeli", "gakvt", "es_ra_ghirs"] }
      ]
    },
    {
      id: "directions",
      title: "Getting Around",
      emoji: "🧭",
      description: "Left, right, and “stop here, please!”",
      lessons: [
        { id: "directions-1", title: "Which way?",
          items: ["martskhniv", "marjvniv", "pirdapir", "ak", "ik"] },
        { id: "directions-2", title: "Near & far",
          items: ["akhlos", "shors", "sad_aris_tualeti", "sadguri"] },
        { id: "directions-3", title: "Taxi & tickets",
          items: ["aeroporti", "taksi", "bileti", "ak_gaacheret"] }
      ]
    },
    {
      id: "verbs",
      title: "Doing Words",
      emoji: "🏃",
      description: "I go, I see, I eat — your first Georgian verbs.",
      lessons: [
        { id: "verbs-1", title: "Going & coming",
          items: ["mivdivar", "movdivar", "vkhedav", "vitsi"] },
        { id: "verbs-2", title: "Eating & talking",
          items: ["vcham", "vsvam", "mesmis", "vlaparakob"] },
        { id: "verbs-3", title: "Living & learning",
          items: ["vtskhovrob", "vmushaob", "vstsavlob", "tsavidet"] }
      ]
    }
  ],

  /* ------------------------------------------------------------------ *
   * Vocabulary — 99 items keyed by id.
   * ------------------------------------------------------------------ */
  vocab: {

    /* Unit 1 — Greetings & basics (12) */
    gamarjoba:         { id: "gamarjoba",         ka: "გამარჯობა",           translit: "gamarjoba",            en: "hello",                    emoji: "👋" },
    nakhvamdis:        { id: "nakhvamdis",        ka: "ნახვამდის",           translit: "nakhvamdis",           en: "goodbye",                  emoji: "🚶" },
    dila_mshvidobisa:  { id: "dila_mshvidobisa",  ka: "დილა მშვიდობისა",     translit: "dila mshvidobisa",     en: "good morning",             emoji: "🌅" },
    ghame_mshvidobisa: { id: "ghame_mshvidobisa", ka: "ღამე მშვიდობისა",     translit: "ghame mshvidobisa",    en: "good night",               emoji: "🌙" },
    madloba:           { id: "madloba",           ka: "მადლობა",             translit: "madloba",              en: "thank you",                emoji: "🙏" },
    gmadlobt:          { id: "gmadlobt",          ka: "გმადლობთ",            translit: "gmadlobt",             en: "thank you (formal)",       emoji: "🙇" },
    gtkhovt:           { id: "gtkhovt",           ka: "გთხოვთ",              translit: "gtkhovt",              en: "please",                   emoji: "🤲" },
    bodishi:           { id: "bodishi",           ka: "ბოდიში",              translit: "bodishi",              en: "sorry",                    emoji: "😔" },
    ki:                { id: "ki",                ka: "კი",                  translit: "k'i",                  en: "yes",                      emoji: "✅" },
    ara:               { id: "ara",               ka: "არა",                 translit: "ara",                  en: "no",                       emoji: "❌" },
    rogor_khar:        { id: "rogor_khar",        ka: "როგორ ხარ?",          translit: "rogor khar?",          en: "how are you?",             emoji: "🙂" },
    kargad:            { id: "kargad",            ka: "კარგად",              translit: "k'argad",              en: "fine, well",               emoji: "👍" },

    /* Unit 2 — People & family (12) */
    deda:              { id: "deda",              ka: "დედა",                translit: "deda",                 en: "mother",                   emoji: "👩" },
    mama:              { id: "mama",              ka: "მამა",                translit: "mama",                 en: "father",                   emoji: "👨" },
    bebia:             { id: "bebia",             ka: "ბებია",               translit: "bebia",                en: "grandmother",              emoji: "👵" },
    babua:             { id: "babua",             ka: "ბაბუა",               translit: "babua",                en: "grandfather",              emoji: "👴" },
    da:                { id: "da",                ka: "და",                  translit: "da",                   en: "sister",                   emoji: "👧" },
    dzma:              { id: "dzma",              ka: "ძმა",                 translit: "dzma",                 en: "brother",                  emoji: "👦" },
    shvili:            { id: "shvili",            ka: "შვილი",               translit: "shvili",               en: "son / daughter",           emoji: "🧒" },
    bavshvi:           { id: "bavshvi",           ka: "ბავშვი",              translit: "bavshvi",              en: "child",                    emoji: "👶" },
    ojakhi:            { id: "ojakhi",            ka: "ოჯახი",               translit: "ojakhi",               en: "family",                   emoji: "👨‍👩‍👧‍👦" },
    megobari:          { id: "megobari",          ka: "მეგობარი",            translit: "megobari",             en: "friend",                   emoji: "🤝" },
    katsi:             { id: "katsi",             ka: "კაცი",                translit: "k'atsi",               en: "man",                      emoji: "🧔" },
    kali:              { id: "kali",              ka: "ქალი",                translit: "kali",                 en: "woman",                    emoji: "👩‍🦰" },

    /* Unit 3 — Numbers (11) */
    erti:              { id: "erti",              ka: "ერთი",                translit: "erti",                 en: "one",                      emoji: "1️⃣" },
    ori:               { id: "ori",               ka: "ორი",                 translit: "ori",                  en: "two",                      emoji: "2️⃣" },
    sami:              { id: "sami",              ka: "სამი",                translit: "sami",                 en: "three",                    emoji: "3️⃣" },
    otkhi:             { id: "otkhi",             ka: "ოთხი",                translit: "otkhi",                en: "four",                     emoji: "4️⃣" },
    khuti:             { id: "khuti",             ka: "ხუთი",                translit: "khuti",                en: "five",                     emoji: "5️⃣" },
    ekvsi:             { id: "ekvsi",             ka: "ექვსი",               translit: "ekvsi",                en: "six",                      emoji: "6️⃣" },
    shvidi:            { id: "shvidi",            ka: "შვიდი",               translit: "shvidi",               en: "seven",                    emoji: "7️⃣" },
    rva:               { id: "rva",               ka: "რვა",                 translit: "rva",                  en: "eight",                    emoji: "8️⃣" },
    tskhra:            { id: "tskhra",            ka: "ცხრა",                translit: "tskhra",               en: "nine",                     emoji: "9️⃣" },
    ati:               { id: "ati",               ka: "ათი",                 translit: "ati",                  en: "ten",                      emoji: "🔟" },
    nuli:              { id: "nuli",              ka: "ნული",                translit: "nuli",                 en: "zero",                     emoji: "0️⃣" },

    /* Unit 4 — Food & drink (13) */
    puri:              { id: "puri",              ka: "პური",                translit: "p'uri",                en: "bread",                    emoji: "🍞" },
    qveli:             { id: "qveli",             ka: "ყველი",               translit: "q'veli",               en: "cheese",                   emoji: "🧀" },
    kvertskhi:         { id: "kvertskhi",         ka: "კვერცხი",             translit: "k'vertskhi",           en: "egg",                      emoji: "🥚" },
    rdze:              { id: "rdze",              ka: "რძე",                 translit: "rdze",                 en: "milk",                     emoji: "🥛" },
    shakari:           { id: "shakari",           ka: "შაქარი",              translit: "shakari",              en: "sugar",                    emoji: "🍬" },
    khachapuri:        { id: "khachapuri",        ka: "ხაჭაპური",            translit: "khach'ap'uri",         en: "khachapuri (cheese bread)", emoji: "🫓" },
    khinkali:          { id: "khinkali",          ka: "ხინკალი",             translit: "khink'ali",            en: "khinkali (dumpling)",      emoji: "🥟" },
    vashli:            { id: "vashli",            ka: "ვაშლი",               translit: "vashli",               en: "apple",                    emoji: "🍎" },
    khili:             { id: "khili",             ka: "ხილი",                translit: "khili",                en: "fruit",                    emoji: "🍉" },
    tsqali:            { id: "tsqali",            ka: "წყალი",               translit: "ts'q'ali",             en: "water",                    emoji: "💧" },
    chai:              { id: "chai",              ka: "ჩაი",                 translit: "chai",                 en: "tea",                      emoji: "🍵" },
    qava:              { id: "qava",              ka: "ყავა",                translit: "q'ava",                en: "coffee",                   emoji: "☕" },
    tsveni:            { id: "tsveni",            ka: "წვენი",               translit: "ts'veni",              en: "juice",                    emoji: "🧃" },

    /* Unit 5 — Colors (12) */
    peri:              { id: "peri",              ka: "ფერი",                translit: "peri",                 en: "color",                    emoji: "🎨" },
    tsiteli:           { id: "tsiteli",           ka: "წითელი",              translit: "ts'iteli",             en: "red",                      emoji: "🔴" },
    tetri:             { id: "tetri",             ka: "თეთრი",               translit: "tetri",                en: "white",                    emoji: "⚪" },
    shavi:             { id: "shavi",             ka: "შავი",                translit: "shavi",                en: "black",                    emoji: "⚫" },
    lurji:             { id: "lurji",             ka: "ლურჯი",               translit: "lurji",                en: "blue",                     emoji: "🔵" },
    mtsvane:           { id: "mtsvane",           ka: "მწვანე",              translit: "mts'vane",             en: "green",                    emoji: "🟢" },
    qviteli:           { id: "qviteli",           ka: "ყვითელი",             translit: "q'viteli",             en: "yellow",                   emoji: "🟡" },
    narinjisperi:      { id: "narinjisperi",      ka: "ნარინჯისფერი",        translit: "narinjisperi",         en: "orange (color)",           emoji: "🟠" },
    iisperi:           { id: "iisperi",           ka: "იისფერი",             translit: "iisperi",              en: "purple",                   emoji: "🟣" },
    vardisperi:        { id: "vardisperi",        ka: "ვარდისფერი",          translit: "vardisperi",           en: "pink",                     emoji: "🌸" },
    qavisperi:         { id: "qavisperi",         ka: "ყავისფერი",           translit: "q'avisperi",           en: "brown",                    emoji: "🟤" },
    natsrisperi:       { id: "natsrisperi",       ka: "ნაცრისფერი",          translit: "natsrisperi",          en: "gray",                     emoji: "🩶" },

    /* Unit 6 — Animals (13) */
    kata:              { id: "kata",              ka: "კატა",                translit: "k'at'a",               en: "cat",                      emoji: "🐱" },
    dzaghli:           { id: "dzaghli",           ka: "ძაღლი",               translit: "dzaghli",              en: "dog",                      emoji: "🐶" },
    tskheni:           { id: "tskheni",           ka: "ცხენი",               translit: "tskheni",              en: "horse",                    emoji: "🐴" },
    kurdgheli:         { id: "kurdgheli",         ka: "კურდღელი",            translit: "k'urdgheli",           en: "rabbit",                   emoji: "🐰" },
    dzrokha:           { id: "dzrokha",           ka: "ძროხა",               translit: "dzrokha",              en: "cow",                      emoji: "🐮" },
    ghori:             { id: "ghori",             ka: "ღორი",                translit: "ghori",                en: "pig",                      emoji: "🐷" },
    tkha:              { id: "tkha",              ka: "თხა",                 translit: "tkha",                 en: "goat",                     emoji: "🐐" },
    tskhvari:          { id: "tskhvari",          ka: "ცხვარი",              translit: "tskhvari",             en: "sheep",                    emoji: "🐑" },
    tskhoveli:         { id: "tskhoveli",         ka: "ცხოველი",             translit: "tskhoveli",            en: "animal",                   emoji: "🐾" },
    prinveli:          { id: "prinveli",          ka: "ფრინველი",            translit: "prinveli",             en: "bird",                     emoji: "🐦" },
    tevzi:             { id: "tevzi",             ka: "თევზი",               translit: "tevzi",                en: "fish",                     emoji: "🐟" },
    datvi:             { id: "datvi",             ka: "დათვი",               translit: "datvi",                en: "bear",                     emoji: "🐻" },
    mgeli:             { id: "mgeli",             ka: "მგელი",               translit: "mgeli",                en: "wolf",                     emoji: "🐺" },

    /* Unit 7 — Around town (14) */
    kalaki:            { id: "kalaki",            ka: "ქალაქი",              translit: "kalaki",               en: "city",                     emoji: "🌆" },
    tbilisi:           { id: "tbilisi",           ka: "თბილისი",             translit: "tbilisi",              en: "Tbilisi",                  emoji: "🇬🇪" },
    kucha:             { id: "kucha",             ka: "ქუჩა",                translit: "kucha",                en: "street",                   emoji: "🛣️" },
    sakhli:            { id: "sakhli",            ka: "სახლი",               translit: "sakhli",               en: "house",                    emoji: "🏠" },
    mta:               { id: "mta",               ka: "მთა",                 translit: "mta",                  en: "mountain",                 emoji: "⛰️" },
    maghazia:          { id: "maghazia",          ka: "მაღაზია",             translit: "maghazia",             en: "shop, store",              emoji: "🏪" },
    bazari:            { id: "bazari",            ka: "ბაზარი",              translit: "bazari",               en: "market",                   emoji: "🧺" },
    restorani:         { id: "restorani",         ka: "რესტორანი",           translit: "rest'orani",           en: "restaurant",               emoji: "🍽️" },
    sastumro:          { id: "sastumro",          ka: "სასტუმრო",            translit: "sast'umro",            en: "hotel",                    emoji: "🏨" },
    skola:             { id: "skola",             ka: "სკოლა",               translit: "sk'ola",               en: "school",                   emoji: "🏫" },
    eklesia:           { id: "eklesia",           ka: "ეკლესია",             translit: "ek'lesia",             en: "church",                   emoji: "⛪" },
    muzeumi:           { id: "muzeumi",           ka: "მუზეუმი",             translit: "muzeumi",              en: "museum",                   emoji: "🏛️" },
    parki:             { id: "parki",             ka: "პარკი",               translit: "p'ark'i",              en: "park",                     emoji: "🌳" },
    avtobusi:          { id: "avtobusi",          ka: "ავტობუსი",            translit: "avt'obusi",            en: "bus",                      emoji: "🚌" },

    /* Unit 8 — Useful phrases (12) */
    me_mkvia:          { id: "me_mkvia",          ka: "მე მქვია...",          translit: "me mkvia...",          en: "my name is...",            emoji: "🏷️" },
    me_var:            { id: "me_var",            ka: "მე ვარ...",            translit: "me var...",            en: "I am...",                  emoji: "🙋‍♂️" },
    ukatsravad:        { id: "ukatsravad",        ka: "უკაცრავად",           translit: "uk'atsravad",          en: "excuse me",                emoji: "🫣" },
    kargi:             { id: "kargi",             ka: "კარგი",               translit: "k'argi",               en: "good, okay",               emoji: "👌" },
    sad_aris:          { id: "sad_aris",          ka: "სად არის...?",         translit: "sad aris...?",         en: "where is...?",             emoji: "📍" },
    ramdeni_ghirs:     { id: "ramdeni_ghirs",     ka: "რამდენი ღირს?",       translit: "ramdeni ghirs?",       en: "how much does it cost?",   emoji: "💰" },
    minda:             { id: "minda",             ka: "მინდა",               translit: "minda",                en: "I want",                   emoji: "✨" },
    damekhmaret:       { id: "damekhmaret",       ka: "დამეხმარეთ",          translit: "damekhmaret",          en: "please help me",           emoji: "🆘" },
    ar_vitsi:          { id: "ar_vitsi",          ka: "არ ვიცი",             translit: "ar vitsi",             en: "I don't know",             emoji: "🤷" },
    ar_mesmis:         { id: "ar_mesmis",         ka: "არ მესმის",           translit: "ar mesmis",            en: "I don't understand",       emoji: "😕" },
    inglisurad:        { id: "inglisurad",        ka: "ლაპარაკობთ ინგლისურად?", translit: "lap'arak'obt inglisurad?", en: "do you speak English?", emoji: "🗣️" },
    kartuli:           { id: "kartuli",           ka: "ქართული",             translit: "kartuli",              en: "Georgian (language)",      emoji: "📖" },

    /* ---------------- v3 — Sakartvelo release: 99 unit items ---------------- */

    /* Unit 9 — Feelings & needs (12) */
    bednieri:          { id: "bednieri",          ka: "ბედნიერი",            translit: "bednieri",             en: "happy",                    emoji: "😊" },
    motsqenili:        { id: "motsqenili",        ka: "მოწყენილი",           translit: "mots'q'enili",         en: "sad",                      emoji: "😢" },
    daghlili:          { id: "daghlili",          ka: "დაღლილი",             translit: "daghlili",             en: "tired",                    emoji: "😴" },
    mikharia:          { id: "mikharia",          ka: "მიხარია",             translit: "mikharia",             en: "I'm glad",                 emoji: "😄" },
    mshia:             { id: "mshia",             ka: "მშია",                translit: "mshia",                en: "I'm hungry",               emoji: "🍽️" },
    mtsquria:          { id: "mtsquria",          ka: "მწყურია",             translit: "mts'q'uria",           en: "I'm thirsty",              emoji: "🥤" },
    mtsiva:            { id: "mtsiva",            ka: "მცივა",               translit: "mtsiva",               en: "I'm cold",                 emoji: "🥶" },
    mtskhela:          { id: "mtskhela",          ka: "მცხელა",              translit: "mtskhela",             en: "I'm hot",                  emoji: "🥵" },
    momtsons:          { id: "momtsons",          ka: "მომწონს",             translit: "momts'ons",            en: "I like it",                emoji: "👍" },
    miqvarkhar:        { id: "miqvarkhar",        ka: "მიყვარხარ",           translit: "miq'varkhar",          en: "I love you",               emoji: "❤️" },
    mchirdeba:         { id: "mchirdeba",         ka: "მჭირდება...",          translit: "mch'irdeba...",        en: "I need...",                emoji: "🙏" },
    tsudad_var:        { id: "tsudad_var",        ka: "ცუდად ვარ",           translit: "tsudad var",           en: "I feel unwell",            emoji: "🤒" },

    /* Unit 10 — Time & days (13) */
    dghes:             { id: "dghes",             ka: "დღეს",                translit: "dghes",                en: "today",                    emoji: "📅" },
    khval:             { id: "khval",             ka: "ხვალ",                translit: "khval",                en: "tomorrow",                 emoji: "➡️" },
    gushin:            { id: "gushin",            ka: "გუშინ",               translit: "gushin",               en: "yesterday",                emoji: "⬅️" },
    akhla:             { id: "akhla",             ka: "ახლა",                translit: "akhla",                en: "now",                      emoji: "⏰" },
    mere:              { id: "mere",              ka: "მერე",                translit: "mere",                 en: "later",                    emoji: "⏳" },
    dghe:              { id: "dghe",              ka: "დღე",                 translit: "dghe",                 en: "day",                      emoji: "🌞" },
    dila:              { id: "dila",              ka: "დილა",                translit: "dila",                 en: "morning",                  emoji: "🌅" },
    saghamo:           { id: "saghamo",           ka: "საღამო",              translit: "saghamo",              en: "evening",                  emoji: "🌆" },
    orshabati:         { id: "orshabati",         ka: "ორშაბათი",            translit: "orshabati",            en: "Monday",                   emoji: "🗓️" },
    shabati:           { id: "shabati",           ka: "შაბათი",              translit: "shabati",              en: "Saturday",                 emoji: "🎈" },
    kvira:             { id: "kvira",             ka: "კვირა",               translit: "k'vira",               en: "Sunday (also: week)",      emoji: "☀️" },
    romeli_saatia:     { id: "romeli_saatia",     ka: "რომელი საათია?",      translit: "romeli saatia?",       en: "what time is it?",         emoji: "🕐" },
    saati:             { id: "saati",             ka: "საათი",               translit: "saati",                en: "clock, hour",              emoji: "⌚" },

    /* Unit 11 — Weather & seasons (12) */
    amindi:            { id: "amindi",            ka: "ამინდი",              translit: "amindi",               en: "weather",                  emoji: "🌤️" },
    mze:               { id: "mze",               ka: "მზე",                 translit: "mze",                  en: "sun",                      emoji: "☀️" },
    tsvima:            { id: "tsvima",            ka: "წვიმა",               translit: "ts'vima",              en: "rain",                     emoji: "🌧️" },
    tovli:             { id: "tovli",             ka: "თოვლი",               translit: "tovli",                en: "snow",                     emoji: "❄️" },
    kari:              { id: "kari",              ka: "ქარი",                translit: "kari",                 en: "wind",                     emoji: "💨" },
    tsiva:             { id: "tsiva",             ka: "ცივა",                translit: "tsiva",                en: "it's cold (outside)",      emoji: "🧊" },
    tskhela:           { id: "tskhela",           ka: "ცხელა",               translit: "tskhela",              en: "it's hot (outside)",       emoji: "🔥" },
    kargi_amindia:     { id: "kargi_amindia",     ka: "კარგი ამინდია",       translit: "k'argi amindia",       en: "the weather is nice",      emoji: "🌞" },
    gazapkhuli:        { id: "gazapkhuli",        ka: "გაზაფხული",           translit: "gazapkhuli",           en: "spring",                   emoji: "🌸" },
    zapkhuli:          { id: "zapkhuli",          ka: "ზაფხული",             translit: "zapkhuli",             en: "summer",                   emoji: "🏖️" },
    shemodgoma:        { id: "shemodgoma",        ka: "შემოდგომა",           translit: "shemodgoma",           en: "autumn",                   emoji: "🍂" },
    zamtari:           { id: "zamtari",           ka: "ზამთარი",             translit: "zamtari",              en: "winter",                   emoji: "⛄" },

    /* Unit 12 — At the restaurant (13) */
    meniu:             { id: "meniu",             ka: "მენიუ",               translit: "meniu",                en: "menu",                     emoji: "📋" },
    magida:            { id: "magida",            ka: "მაგიდა",              translit: "magida",               en: "table",                    emoji: "🪑" },
    opitsianti:        { id: "opitsianti",        ka: "ოფიციანტი",           translit: "opitsiant'i",          en: "waiter",                   emoji: "🤵" },
    salati:            { id: "salati",            ka: "სალათი",              translit: "salati",               en: "salad",                    emoji: "🥗" },
    supi:              { id: "supi",              ka: "სუპი",                translit: "sup'i",                en: "soup",                     emoji: "🍲" },
    khortsi:           { id: "khortsi",           ka: "ხორცი",               translit: "khortsi",              en: "meat",                     emoji: "🥩" },
    naqini:            { id: "naqini",            ka: "ნაყინი",              translit: "naq'ini",              en: "ice cream",                emoji: "🍦" },
    limonati:          { id: "limonati",          ka: "ლიმონათი",            translit: "limonati",             en: "lemonade",                 emoji: "🥤" },
    gemrielia:         { id: "gemrielia",         ka: "გემრიელია!",          translit: "gemrielia!",           en: "it's delicious!",          emoji: "😋" },
    gemrielad_miirtvit:{ id: "gemrielad_miirtvit",ka: "გემრიელად მიირთვით!", translit: "gemrielad miirtvit!",  en: "bon appétit!",             emoji: "🍽️" },
    erti_khinkali_gtkhovt: { id: "erti_khinkali_gtkhovt", ka: "ერთი ხინკალი, გთხოვთ", translit: "erti khink'ali, gtkhovt", en: "one khinkali, please", emoji: "🥟" },
    angarishi_gtkhovt: { id: "angarishi_gtkhovt", ka: "ანგარიში, გთხოვთ",    translit: "angarishi, gtkhovt",   en: "the bill, please",         emoji: "🧾" },
    gaumarjos:         { id: "gaumarjos",         ka: "გაუმარჯოს!",          translit: "gaumarjos!",           en: "cheers! / hooray!",        emoji: "🎉" },

    /* Unit 13 — Shopping & money (12) */
    puli:              { id: "puli",              ka: "ფული",                translit: "puli",                 en: "money",                    emoji: "💵" },
    lari:              { id: "lari",              ka: "ლარი",                translit: "lari",                 en: "lari (Georgian money)",    emoji: "💰" },
    dzviri:            { id: "dzviri",            ka: "ძვირი",               translit: "dzviri",               en: "expensive",                emoji: "💎" },
    iapi:              { id: "iapi",              ka: "იაფი",                translit: "iapi",                 en: "cheap",                    emoji: "🏷️" },
    didi:              { id: "didi",              ka: "დიდი",                translit: "didi",                 en: "big",                      emoji: "🐘" },
    patara:            { id: "patara",            ka: "პატარა",              translit: "p'at'ara",             en: "small",                    emoji: "🐭" },
    akhali:            { id: "akhali",            ka: "ახალი",               translit: "akhali",               en: "new",                      emoji: "✨" },
    sachukari:         { id: "sachukari",         ka: "საჩუქარი",            translit: "sachukari",            en: "gift",                     emoji: "🎁" },
    tansatsmeli:       { id: "tansatsmeli",       ka: "ტანსაცმელი",          translit: "t'ansatsmeli",         en: "clothes",                  emoji: "👕" },
    pekhsatsmeli:      { id: "pekhsatsmeli",      ka: "ფეხსაცმელი",          translit: "pekhsatsmeli",         en: "shoes",                    emoji: "👟" },
    gakvt:             { id: "gakvt",             ka: "გაქვთ...?",            translit: "gakvt...?",            en: "do you have...?",          emoji: "🙋" },
    es_ra_ghirs:       { id: "es_ra_ghirs",       ka: "ეს რა ღირს?",         translit: "es ra ghirs?",         en: "how much is this?",        emoji: "🪙" },

    /* Unit 14 — Getting around (13) */
    martskhniv:        { id: "martskhniv",        ka: "მარცხნივ",            translit: "martskhniv",           en: "left",                     emoji: "⬅️" },
    marjvniv:          { id: "marjvniv",          ka: "მარჯვნივ",            translit: "marjvniv",             en: "right",                    emoji: "➡️" },
    pirdapir:          { id: "pirdapir",          ka: "პირდაპირ",            translit: "p'irdap'ir",           en: "straight ahead",           emoji: "⬆️" },
    ak:                { id: "ak",                ka: "აქ",                  translit: "ak",                   en: "here",                     emoji: "📍" },
    ik:                { id: "ik",                ka: "იქ",                  translit: "ik",                   en: "there",                    emoji: "👉" },
    akhlos:            { id: "akhlos",            ka: "ახლოს",               translit: "akhlos",               en: "near",                     emoji: "🤏" },
    shors:             { id: "shors",             ka: "შორს",                translit: "shors",                en: "far",                      emoji: "🔭" },
    sad_aris_tualeti:  { id: "sad_aris_tualeti",  ka: "სად არის ტუალეტი?",   translit: "sad aris t'ualet'i?",  en: "where is the bathroom?",   emoji: "🚻" },
    aeroporti:         { id: "aeroporti",         ka: "აეროპორტი",           translit: "aerop'ort'i",          en: "airport",                  emoji: "✈️" },
    sadguri:           { id: "sadguri",           ka: "სადგური",             translit: "sadguri",              en: "station",                  emoji: "🚉" },
    taksi:             { id: "taksi",             ka: "ტაქსი",               translit: "t'aksi",               en: "taxi",                     emoji: "🚕" },
    bileti:            { id: "bileti",            ka: "ბილეთი",              translit: "bileti",               en: "ticket",                   emoji: "🎫" },
    ak_gaacheret:      { id: "ak_gaacheret",      ka: "აქ გააჩერეთ",         translit: "ak gaacheret",         en: "stop here (polite)",       emoji: "🛑" },

    /* Unit 15 — Doing words (12) */
    mivdivar:          { id: "mivdivar",          ka: "მივდივარ",            translit: "mivdivar",             en: "I'm going",                emoji: "🚶" },
    movdivar:          { id: "movdivar",          ka: "მოვდივარ",            translit: "movdivar",             en: "I'm coming",               emoji: "🏃" },
    vkhedav:           { id: "vkhedav",           ka: "ვხედავ",              translit: "vkhedav",              en: "I see",                    emoji: "👀" },
    vitsi:             { id: "vitsi",             ka: "ვიცი",                translit: "vitsi",                en: "I know",                   emoji: "💡" },
    mesmis:            { id: "mesmis",            ka: "მესმის",              translit: "mesmis",               en: "I understand",             emoji: "🧠" },
    vcham:             { id: "vcham",             ka: "ვჭამ",                translit: "vch'am",               en: "I eat",                    emoji: "🍴" },
    vsvam:             { id: "vsvam",             ka: "ვსვამ",               translit: "vsvam",                en: "I drink",                  emoji: "🥤" },
    vlaparakob:        { id: "vlaparakob",        ka: "ვლაპარაკობ",          translit: "vlap'arak'ob",         en: "I speak",                  emoji: "🗣️" },
    vtskhovrob:        { id: "vtskhovrob",        ka: "ვცხოვრობ",            translit: "vtskhovrob",           en: "I live (somewhere)",       emoji: "🏡" },
    vmushaob:          { id: "vmushaob",          ka: "ვმუშაობ",             translit: "vmushaob",             en: "I work",                   emoji: "💼" },
    vstsavlob:         { id: "vstsavlob",         ka: "ვსწავლობ",            translit: "vsts'avlob",           en: "I'm learning",             emoji: "📚" },
    tsavidet:          { id: "tsavidet",          ka: "წავიდეთ!",            translit: "ts'avidet!",           en: "let's go!",                emoji: "🎉" },

    /* Unit 16 — Questions & small talk (12) */
    ra:                { id: "ra",                ka: "რა?",                 translit: "ra?",                  en: "what?",                    emoji: "❓" },
    vin:               { id: "vin",               ka: "ვინ?",                translit: "vin?",                 en: "who?",                     emoji: "👤" },
    sad:               { id: "sad",               ka: "სად?",                translit: "sad?",                 en: "where?",                   emoji: "📍" },
    rodis:             { id: "rodis",             ka: "როდის?",              translit: "rodis?",               en: "when?",                    emoji: "🕰️" },
    ratom:             { id: "ratom",             ka: "რატომ?",              translit: "rat'om?",              en: "why?",                     emoji: "🤔" },
    rogor:             { id: "rogor",             ka: "როგორ?",              translit: "rogor?",               en: "how?",                     emoji: "⚙️" },
    es_ra_aris:        { id: "es_ra_aris",        ka: "ეს რა არის?",         translit: "es ra aris?",          en: "what is this?",            emoji: "👉" },
    saidan_khart:      { id: "saidan_khart",      ka: "საიდან ხართ?",        translit: "saidan khart?",        en: "where are you from?",      emoji: "🌍" },
    sasiamovnoa:       { id: "sasiamovnoa",       ka: "სასიამოვნოა",         translit: "sasiamovnoa",          en: "nice to meet you",         emoji: "🤝" },
    mobrdzandit:       { id: "mobrdzandit",       ka: "მობრძანდით!",         translit: "mobrdzandit!",         en: "welcome! / come in!",      emoji: "🚪" },
    shekhvedramde:     { id: "shekhvedramde",     ka: "შეხვედრამდე",         translit: "shekhvedramde",        en: "see you later",            emoji: "👋" },
    ra_tkma_unda:      { id: "ra_tkma_unda",      ka: "რა თქმა უნდა",        translit: "ra tkma unda",         en: "of course",                emoji: "💯" },

    /* ------------- v3 bonus pool (30) — Word of the Day & practice mixer.
     * Not in any unit; ids listed in C.bonusWords below. ------------- */

    /* Numbers 11–20 (10) */
    tertmeti:          { id: "tertmeti",          ka: "თერთმეტი",            translit: "tertmet'i",            en: "eleven",                   emoji: "1️⃣1️⃣" },
    tormeti:           { id: "tormeti",           ka: "თორმეტი",             translit: "tormet'i",             en: "twelve",                   emoji: "1️⃣2️⃣" },
    tsameti:           { id: "tsameti",           ka: "ცამეტი",              translit: "tsamet'i",             en: "thirteen",                 emoji: "1️⃣3️⃣" },
    totkhmeti:         { id: "totkhmeti",         ka: "თოთხმეტი",            translit: "totkhmet'i",           en: "fourteen",                 emoji: "1️⃣4️⃣" },
    tkhutmeti:         { id: "tkhutmeti",         ka: "თხუთმეტი",            translit: "tkhutmet'i",           en: "fifteen",                  emoji: "1️⃣5️⃣" },
    tekvsmeti:         { id: "tekvsmeti",         ka: "თექვსმეტი",           translit: "tekvsmet'i",           en: "sixteen",                  emoji: "1️⃣6️⃣" },
    chvidmeti:         { id: "chvidmeti",         ka: "ჩვიდმეტი",            translit: "chvidmet'i",           en: "seventeen",                emoji: "1️⃣7️⃣" },
    tvrameti:          { id: "tvrameti",          ka: "თვრამეტი",            translit: "tvramet'i",            en: "eighteen",                 emoji: "1️⃣8️⃣" },
    tskhrameti:        { id: "tskhrameti",        ka: "ცხრამეტი",            translit: "tskhramet'i",          en: "nineteen",                 emoji: "1️⃣9️⃣" },
    otsi:              { id: "otsi",              ka: "ოცი",                 translit: "otsi",                 en: "twenty",                   emoji: "2️⃣0️⃣" },

    /* Everyday things (10) */
    tsigni:            { id: "tsigni",            ka: "წიგნი",               translit: "ts'igni",              en: "book",                     emoji: "📚" },
    teleponi:          { id: "teleponi",          ka: "ტელეფონი",            translit: "t'eleponi",            en: "phone",                    emoji: "📱" },
    gasaghebi:         { id: "gasaghebi",         ka: "გასაღები",            translit: "gasaghebi",            en: "key",                      emoji: "🔑" },
    chanta:            { id: "chanta",            ka: "ჩანთა",               translit: "chanta",               en: "bag",                      emoji: "🎒" },
    kari_door:         { id: "kari_door",         ka: "კარი",                translit: "k'ari",                en: "door",                     emoji: "🚪" },
    panjara:           { id: "panjara",           ka: "ფანჯარა",             translit: "panjara",              en: "window",                   emoji: "🪟" },
    skami:             { id: "skami",             ka: "სკამი",               translit: "sk'ami",               en: "chair",                    emoji: "🪑" },
    satsoli:           { id: "satsoli",           ka: "საწოლი",              translit: "sats'oli",             en: "bed",                      emoji: "🛏️" },
    mankana:           { id: "mankana",           ka: "მანქანა",             translit: "mankana",              en: "car",                      emoji: "🚗" },
    kalami:            { id: "kalami",            ka: "კალამი",              translit: "k'alami",              en: "pen",                      emoji: "✏️" },

    /* Nature (10) */
    varskvlavi:        { id: "varskvlavi",        ka: "ვარსკვლავი",          translit: "varsk'vlavi",          en: "star",                     emoji: "⭐" },
    mtvare:            { id: "mtvare",            ka: "მთვარე",              translit: "mtvare",               en: "moon",                     emoji: "🌙" },
    mdinare:           { id: "mdinare",           ka: "მდინარე",             translit: "mdinare",              en: "river",                    emoji: "🏞️" },
    tqe:               { id: "tqe",               ka: "ტყე",                 translit: "t'q'e",                en: "forest",                   emoji: "🌲" },
    zghva:             { id: "zghva",             ka: "ზღვა",                translit: "zghva",                en: "sea",                      emoji: "🌊" },
    khe:               { id: "khe",               ka: "ხე",                  translit: "khe",                  en: "tree",                     emoji: "🌳" },
    qvavili:           { id: "qvavili",           ka: "ყვავილი",             translit: "q'vavili",             en: "flower",                   emoji: "🌸" },
    baghi:             { id: "baghi",             ka: "ბაღი",                translit: "baghi",                en: "garden",                   emoji: "🏡" },
    khidi:             { id: "khidi",             ka: "ხიდი",                translit: "khidi",                en: "bridge",                   emoji: "🌉" },
    qurdzeni:          { id: "qurdzeni",          ka: "ყურძენი",             translit: "q'urdzeni",            en: "grapes",                   emoji: "🍇" },

    /* ------------- v4 bonus pool (10) — household things for the games
     * (Find it at home / Market day) and Word of the Day. Not in any
     * unit; ids appended to C.bonusWords below. Audio: audioId === id.
     * NOTE: `chika` (ჭიქა, the cup) is a vocab item with its own clip
     * chika.mp3 — the letter-card clip example-chika stays untouched. */
    chika:             { id: "chika",             ka: "ჭიქა",                translit: "ch'ika",               en: "cup, glass",               emoji: "🥛" },
    kovzi:             { id: "kovzi",             ka: "კოვზი",               translit: "k'ovzi",               en: "spoon",                    emoji: "🥄" },
    changali:          { id: "changali",          ka: "ჩანგალი",             translit: "changali",             en: "fork",                     emoji: "🍴" },
    tepshi:            { id: "tepshi",            ka: "თეფში",               translit: "tepshi",               en: "plate",                    emoji: "🍽️" },
    sapone:            { id: "sapone",            ka: "საპონი",              translit: "sap'oni",              en: "soap",                     emoji: "🧼" },
    sarke:             { id: "sarke",             ka: "სარკე",               translit: "sark'e",               en: "mirror",                   emoji: "🪞" },
    lampa:             { id: "lampa",             ka: "ლამპა",               translit: "lamp'a",               en: "lamp",                     emoji: "💡" },
    divani:            { id: "divani",            ka: "დივანი",              translit: "divani",               en: "sofa",                     emoji: "🛋️" },
    abazana:           { id: "abazana",           ka: "აბაზანა",             translit: "abazana",              en: "bath, bathroom",           emoji: "🛁" },
    chaidani:          { id: "chaidani",          ka: "ჩაიდანი",             translit: "chaidani",             en: "kettle",                   emoji: "🫖" }
  },

  /* ------------------------------------------------------------------ *
   * Letters path — the 6 alphabet groups, easy → hard. The `alphabet`
   * array order above is canonical; groups here reference it by id and
   * never redefine letters. Four steps per group: meet / write / read /
   * exam (the on-screen order — practice reading before the test). The
   * v4 `read` key is ADDITIVE: nothing renamed, and group "done" status
   * still counts meet+trace+exam only, so old saves never regress.
   *
   * `read` — "Read with these letters": a no-stars bonus node (praise +
   * XP only) whose pool uses ONLY letters learned by that group.
   *   - pool.syllables → readingTrack.syllables ids (cumulative set)
   *   - pool.words     → vocab / readingTrack.extras ids
   *
   * Exam recipes (positive-only, hard rules):
   *   - Exams award 1–3 stars by accuracy but NEVER below 1, and can
   *     always be retried. Wrong answers gently shake/dim, then reveal
   *     and SPEAK the correct one. Nothing is ever locked or taken away.
   *   - `from: "group"`          → draw from this group's own letters.
   *   - `from: "earlier-groups"` → review sprinkle from any previous
   *     group (group-1 has none, so it gets an extra own-letter item).
   *   - `syllablePool` lists syllable ids (see readingTrack.syllables)
   *     whose letters ALL belong to groups learned so far.
   * ------------------------------------------------------------------ */
  lettersPath: {
    groups: [
      {
        groupId: "group-1",
        order: 1,
        steps: {
          meet:  { id: "letters-group-1-meet",  kind: "meet",  title: "Meet the letters", sub: "6 letters" },
          write: { id: "letters-group-1-write", kind: "write", title: "Write it",         sub: "Trace each letter" },
          exam:  {
            id: "letters-group-1-exam", kind: "exam", title: "Letter exam",
            recipe: [
              { type: "hear_pick_letter", count: 2, from: "group" },
              { type: "letter_to_sound",  count: 2, from: "group" },
              { type: "trace_letter",     count: 1, from: "group" },
              { type: "build_syllable",   count: 1, syllablePool: ["syl-ba", "syl-de"] },
              /* no earlier group to review yet — extra own-letter question instead */
              { type: "hear_pick_letter", count: 1, from: "group" }
            ]
          },
          read: {
            id: "letters-group-1-read", kind: "read",
            title: "Read with these letters", sub: "Syllables & tiny words",
            pool: {
              syllables: ["syl-ba", "syl-de", "syl-ga", "syl-va", "syl-be"],
              words: ["deda", "da", "rw_bade"]
            },
            recipe: [
              { type: "build_syllable",         count: 2 },
              { type: "letter_to_sound",        count: 1 },
              { type: "hear_pick_word",         count: 2 },
              { type: "read_word_pick_picture", count: 1 },
              { type: "picture_pick_word",      count: 1 }
            ]
          }
        }
      },
      {
        groupId: "group-2",
        order: 2,
        steps: {
          meet:  { id: "letters-group-2-meet",  kind: "meet",  title: "Meet the letters", sub: "6 letters" },
          write: { id: "letters-group-2-write", kind: "write", title: "Write it",         sub: "Trace each letter" },
          exam:  {
            id: "letters-group-2-exam", kind: "exam", title: "Letter exam",
            recipe: [
              { type: "hear_pick_letter", count: 2, from: "group" },
              { type: "letter_to_sound",  count: 2, from: "group" },
              { type: "trace_letter",     count: 1, from: "group" },
              { type: "build_syllable",   count: 1, syllablePool: ["syl-ba", "syl-de", "syl-ma", "syl-di"] },
              { type: "letter_to_sound",  count: 1, from: "earlier-groups" },
              { type: "hear_pick_letter", count: 1, from: "earlier-groups" }
            ]
          },
          read: {
            id: "letters-group-2-read", kind: "read",
            title: "Read with these letters", sub: "Syllables & tiny words",
            pool: {
              syllables: ["syl-ba", "syl-de", "syl-ga", "syl-va", "syl-be",
                          "syl-ma", "syl-di", "syl-ze", "syl-mi", "syl-li"],
              words: ["mama", "dila", "ki", "mta", "didi", "ati", "bebia", "tevzi"]
            },
            recipe: [
              { type: "build_syllable",         count: 2 },
              { type: "letter_to_sound",        count: 1 },
              { type: "hear_pick_word",         count: 2 },
              { type: "read_word_pick_picture", count: 1 },
              { type: "picture_pick_word",      count: 1 }
            ]
          }
        }
      },
      {
        groupId: "group-3",
        order: 3,
        steps: {
          meet:  { id: "letters-group-3-meet",  kind: "meet",  title: "Meet the letters", sub: "6 letters" },
          write: { id: "letters-group-3-write", kind: "write", title: "Write it",         sub: "Trace each letter" },
          exam:  {
            id: "letters-group-3-exam", kind: "exam", title: "Letter exam",
            recipe: [
              { type: "hear_pick_letter", count: 2, from: "group" },
              { type: "letter_to_sound",  count: 2, from: "group" },
              { type: "trace_letter",     count: 1, from: "group" },
              { type: "build_syllable",   count: 1, syllablePool: ["syl-ma", "syl-sa", "syl-di", "syl-ba", "syl-de", "syl-lo", "syl-ni", "syl-go"] },
              { type: "letter_to_sound",  count: 1, from: "earlier-groups" },
              { type: "hear_pick_letter", count: 1, from: "earlier-groups" }
            ]
          },
          read: {
            id: "letters-group-3-read", kind: "read",
            title: "Read with these letters", sub: "Syllables & tiny words",
            pool: {
              syllables: ["syl-ba", "syl-de", "syl-ga", "syl-va", "syl-be",
                          "syl-ma", "syl-di", "syl-ze", "syl-mi", "syl-li",
                          "syl-sa", "syl-ni", "syl-lo", "syl-go", "syl-ro", "syl-so"],
              words: ["ara", "ori", "sami", "rva", "mze", "lari", "erti", "skami", "rw_ena"]
            },
            recipe: [
              { type: "build_syllable",         count: 2 },
              { type: "letter_to_sound",        count: 1 },
              { type: "hear_pick_word",         count: 2 },
              { type: "read_word_pick_picture", count: 1 },
              { type: "picture_pick_word",      count: 1 }
            ]
          }
        }
      },
      {
        groupId: "group-4",
        order: 4,
        steps: {
          meet:  { id: "letters-group-4-meet",  kind: "meet",  title: "Meet the letters", sub: "5 letters" },
          write: { id: "letters-group-4-write", kind: "write", title: "Write it",         sub: "Trace each letter" },
          exam:  {
            id: "letters-group-4-exam", kind: "exam", title: "Letter exam",
            recipe: [
              { type: "hear_pick_letter", count: 2, from: "group" },
              { type: "letter_to_sound",  count: 2, from: "group" },
              { type: "trace_letter",     count: 1, from: "group" },
              { type: "build_syllable",   count: 1, syllablePool: ["syl-ma", "syl-sa", "syl-di", "syl-ba", "syl-de", "syl-lo", "syl-ni", "syl-go"] },
              { type: "letter_to_sound",  count: 1, from: "earlier-groups" },
              { type: "hear_pick_letter", count: 1, from: "earlier-groups" }
            ]
          },
          read: {
            id: "letters-group-4-read", kind: "read",
            title: "Read with these letters", sub: "Syllables & tiny words",
            pool: {
              syllables: ["syl-ba", "syl-de", "syl-ga", "syl-va", "syl-be",
                          "syl-ma", "syl-di", "syl-ze", "syl-mi", "syl-li",
                          "syl-sa", "syl-ni", "syl-lo", "syl-go", "syl-ro", "syl-so",
                          "syl-pu", "syl-ku"],
              words: ["puri", "kata", "kali", "puli", "peri", "ghori", "magida", "bileti", "saati"]
            },
            recipe: [
              { type: "build_syllable",         count: 2 },
              { type: "letter_to_sound",        count: 1 },
              { type: "hear_pick_word",         count: 2 },
              { type: "read_word_pick_picture", count: 1 },
              { type: "picture_pick_word",      count: 1 }
            ]
          }
        }
      },
      {
        groupId: "group-5",
        order: 5,
        steps: {
          meet:  { id: "letters-group-5-meet",  kind: "meet",  title: "Meet the letters", sub: "5 letters" },
          write: { id: "letters-group-5-write", kind: "write", title: "Write it",         sub: "Trace each letter" },
          exam:  {
            id: "letters-group-5-exam", kind: "exam", title: "Letter exam",
            recipe: [
              { type: "hear_pick_letter", count: 2, from: "group" },
              { type: "letter_to_sound",  count: 2, from: "group" },
              { type: "trace_letter",     count: 1, from: "group" },
              { type: "build_syllable",   count: 1, syllablePool: ["syl-ma", "syl-sa", "syl-di", "syl-ba", "syl-de", "syl-lo", "syl-ni", "syl-go"] },
              { type: "letter_to_sound",  count: 1, from: "earlier-groups" },
              { type: "hear_pick_letter", count: 1, from: "earlier-groups" }
            ]
          },
          read: {
            id: "letters-group-5-read", kind: "read",
            title: "Read with these letters", sub: "Syllables & tiny words",
            pool: {
              syllables: ["syl-ba", "syl-de", "syl-ga", "syl-va", "syl-be",
                          "syl-ma", "syl-di", "syl-ze", "syl-mi", "syl-li",
                          "syl-sa", "syl-ni", "syl-lo", "syl-go", "syl-ro", "syl-so",
                          "syl-pu", "syl-ku", "syl-sha", "syl-tso"],
              words: ["chai", "rw_tsa", "vashli", "qava", "dzma", "shavi", "shvidi", "qveli", "dzaghli"]
            },
            recipe: [
              { type: "build_syllable",         count: 2 },
              { type: "letter_to_sound",        count: 1 },
              { type: "hear_pick_word",         count: 2 },
              { type: "read_word_pick_picture", count: 1 },
              { type: "picture_pick_word",      count: 1 }
            ]
          }
        }
      },
      {
        groupId: "group-6",
        order: 6,
        steps: {
          meet:  { id: "letters-group-6-meet",  kind: "meet",  title: "Meet the letters", sub: "5 letters" },
          write: { id: "letters-group-6-write", kind: "write", title: "Write it",         sub: "Trace each letter" },
          exam:  {
            id: "letters-group-6-exam", kind: "exam", title: "Letter exam",
            recipe: [
              { type: "hear_pick_letter", count: 2, from: "group" },
              { type: "letter_to_sound",  count: 2, from: "group" },
              { type: "trace_letter",     count: 1, from: "group" },
              { type: "build_syllable",   count: 1, syllablePool: ["syl-ma", "syl-sa", "syl-di", "syl-ba", "syl-de", "syl-lo", "syl-ni", "syl-go"] },
              { type: "letter_to_sound",  count: 1, from: "earlier-groups" },
              { type: "hear_pick_letter", count: 1, from: "earlier-groups" }
            ]
          },
          read: {
            id: "letters-group-6-read", kind: "read",
            title: "Read with these letters", sub: "Syllables & tiny words",
            pool: {
              syllables: ["syl-ba", "syl-de", "syl-ga", "syl-va", "syl-be",
                          "syl-ma", "syl-di", "syl-ze", "syl-mi", "syl-li",
                          "syl-sa", "syl-ni", "syl-lo", "syl-go", "syl-ro", "syl-so",
                          "syl-pu", "syl-ku", "syl-sha", "syl-tso", "syl-kha", "syl-ja"],
              words: ["khe", "khili", "sakhli", "tsqali", "tsigni", "khidi", "khinkali", "khachapuri"]
            },
            recipe: [
              { type: "build_syllable",         count: 2 },
              { type: "letter_to_sound",        count: 1 },
              { type: "hear_pick_word",         count: 2 },
              { type: "read_word_pick_picture", count: 1 },
              { type: "picture_pick_word",      count: 1 }
            ]
          }
        }
      }
    ]
  },

  /* ------------------------------------------------------------------ *
   * Reading track — sound out real Georgian, from 2-letter syllables to
   * long words. `items` reference readingTrack.syllables, readingTrack
   * .extras, or vocab ids above (words reuse existing vocab wherever
   * possible; only 3 tiny new items live in `extras`).
   *
   * Syllables are natural Georgian syllables built from the easiest
   * letters first: მა (mama), სა (sami/sakhli), დი (dila), ბა (bavshvi),
   * დე (deda), ლო (skola/madloba), ნი (banani), გო (megobari, gogo).
   * Syllables have no `en`/`emoji` — renderers fall back to translit.
   *
   * Steps carry practice/exam recipes like lettersPath exams. Same hard
   * rules: exam stars 1–3 by accuracy, never below 1, always retryable,
   * misses reveal + speak the answer, nothing locked, nothing lost.
   * ------------------------------------------------------------------ */
  readingTrack: {
    syllables: [
      { id: "syl-ma", ka: "მა", translit: "ma" },
      { id: "syl-sa", ka: "სა", translit: "sa" },
      { id: "syl-di", ka: "დი", translit: "di" },
      { id: "syl-ba", ka: "ბა", translit: "ba" },
      { id: "syl-de", ka: "დე", translit: "de" },
      { id: "syl-lo", ka: "ლო", translit: "lo" },
      { id: "syl-ni", ka: "ნი", translit: "ni" },
      { id: "syl-go", ka: "გო", translit: "go" },
      /* v4 additions — one/two open syllables per letters group, so
       * every "Read with these letters" node has fresh material.
       * Group markers show the FIRST group whose letters cover them. */
      { id: "syl-ga",  ka: "გა", translit: "ga"  },  // group-1
      { id: "syl-va",  ka: "ვა", translit: "va"  },  // group-1
      { id: "syl-be",  ka: "ბე", translit: "be"  },  // group-1
      { id: "syl-ze",  ka: "ზე", translit: "ze"  },  // group-2
      { id: "syl-mi",  ka: "მი", translit: "mi"  },  // group-2
      { id: "syl-li",  ka: "ლი", translit: "li"  },  // group-2
      { id: "syl-ro",  ka: "რო", translit: "ro"  },  // group-3
      { id: "syl-so",  ka: "სო", translit: "so"  },  // group-3
      { id: "syl-pu",  ka: "ფუ", translit: "pu"  },  // group-4
      { id: "syl-ku",  ka: "ქუ", translit: "ku"  },  // group-4
      { id: "syl-sha", ka: "შა", translit: "sha" },  // group-5
      { id: "syl-tso", ka: "ცო", translit: "tso" },  // group-5
      { id: "syl-kha", ka: "ხა", translit: "kha" },  // group-6
      { id: "syl-ja",  ka: "ჯა", translit: "ja"  }   // group-6
    ],
    extras: [   /* tiny dedicated word list, same shape as vocab items */
      { id: "rw_ia",   ka: "ია",   translit: "ia",   en: "violet (flower)", emoji: "🌼" },
      { id: "rw_tsa",  ka: "ცა",   translit: "tsa",  en: "sky",             emoji: "🌤️" },
      { id: "rw_ena",  ka: "ენა",  translit: "ena",  en: "tongue",          emoji: "👅" },
      /* v4 — a readable group-1-letters-only word for the first read node */
      { id: "rw_bade", ka: "ბადე", translit: "bade", en: "net",             emoji: "🥅" }
    ],
    steps: [
      {
        id: "read-1", title: "First syllables", kind: "syllables",
        items: ["syl-ma", "syl-sa", "syl-di", "syl-ba", "syl-de", "syl-lo", "syl-ni", "syl-go"],
        practice: [
          { type: "build_syllable",   count: 3 },
          { type: "letter_to_sound",  count: 2 },   /* fed the step's syllable items */
          { type: "hear_pick_letter", count: 1 }    /* letters used by the step's syllables */
        ],
        exam: [
          { type: "build_syllable",   count: 3 },
          { type: "letter_to_sound",  count: 2 },
          { type: "hear_pick_letter", count: 2 }
        ]
      },
      {
        /* v4 — inserted between read-1 and read-2. Existing step ids and
         * content are UNCHANGED (progress is keyed by id, not index). */
        id: "read-5", title: "More syllables", kind: "syllables",
        items: ["syl-ga", "syl-va", "syl-ze", "syl-li", "syl-ro", "syl-pu", "syl-sha", "syl-kha"],
        practice: [
          { type: "build_syllable",   count: 3 },
          { type: "letter_to_sound",  count: 2 },
          { type: "hear_pick_letter", count: 1 }
        ],
        exam: [
          { type: "build_syllable",   count: 3 },
          { type: "letter_to_sound",  count: 2 },
          { type: "hear_pick_letter", count: 2 }
        ]
      },
      {
        id: "read-2", title: "Little words", kind: "words",   /* 2–3 letters */
        items: ["rw_ia", "rw_tsa", "rw_ena", "da", "ki", "ara", "mta", "rva", "tkha"],
        practice: [
          { type: "read_word_pick_picture", count: 2 },
          { type: "picture_pick_word",      count: 2 },
          { type: "build_word",             count: 1 },
          { type: "match_pairs",            count: 1 }
        ],
        exam: [
          { type: "read_word_pick_picture", count: 3 },
          { type: "picture_pick_word",      count: 2 },
          { type: "build_word",             count: 1 },
          /* earlier step is syllables, so the review item is a syllable build */
          { type: "build_syllable",         count: 1, syllablePool: ["syl-ma", "syl-sa", "syl-di", "syl-ba", "syl-de", "syl-lo", "syl-ni", "syl-go"] }
        ]
      },
      {
        /* v4 — consonant clusters, gently: მთ, მზ, ძმ, რძ, თხ, რვ, ტყ, ზღ */
        id: "read-6", title: "Two sounds together", kind: "words",
        items: ["mta", "mze", "dzma", "rdze", "tkha", "rva", "tqe", "zghva"],
        practice: [
          { type: "read_word_pick_picture", count: 2 },
          { type: "hear_pick_word",         count: 2 },
          { type: "build_word",             count: 1 },
          { type: "match_pairs",            count: 1 }
        ],
        exam: [
          { type: "read_word_pick_picture", count: 2 },
          { type: "hear_pick_word",         count: 2 },
          { type: "build_word",             count: 1 },
          { type: "picture_pick_word",      count: 1 },
          { type: "build_syllable",         count: 1, syllablePool: ["syl-ga", "syl-va", "syl-ze", "syl-li", "syl-ro", "syl-pu", "syl-sha", "syl-kha"] }
        ]
      },
      {
        id: "read-3", title: "Bigger words", kind: "words",   /* 3–5 letters */
        items: ["deda", "mama", "sami", "kata", "puri", "chai", "tevzi", "sakhli", "vashli"],
        practice: [
          { type: "read_word_pick_picture", count: 2 },
          { type: "picture_pick_word",      count: 2 },
          { type: "build_word",             count: 1 },
          { type: "match_pairs",            count: 1 }
        ],
        exam: [
          { type: "read_word_pick_picture", count: 3 },
          { type: "picture_pick_word",      count: 2 },
          { type: "build_word",             count: 1 },
          { type: "read_word_pick_picture", count: 1, from: "earlier-steps" }
        ]
      },
      {
        /* v4 — 4–6 letter words containing clusters */
        id: "read-7", title: "Clusters in words", kind: "words",
        items: ["mtsvane", "tskheni", "tskhra", "tsqali", "dzaghli", "tevzi", "skola", "tsigni"],
        practice: [
          { type: "read_word_pick_picture", count: 2 },
          { type: "hear_pick_word",         count: 2 },
          { type: "build_word",             count: 1 },
          { type: "match_pairs",            count: 1 }
        ],
        exam: [
          { type: "read_word_pick_picture", count: 3 },
          { type: "hear_pick_word",         count: 2 },
          { type: "build_word",             count: 1 },
          { type: "read_word_pick_picture", count: 1, from: "earlier-steps" }
        ]
      },
      {
        id: "read-4", title: "Long words", kind: "words",
        items: ["megobari", "avtobusi", "kurdgheli", "khinkali", "khachapuri", "maghazia"],
        practice: [
          { type: "read_word_pick_picture", count: 2 },
          { type: "picture_pick_word",      count: 2 },
          { type: "build_word",             count: 1 },
          { type: "match_pairs",            count: 1 }
        ],
        exam: [
          { type: "read_word_pick_picture", count: 3 },
          { type: "picture_pick_word",      count: 2 },
          { type: "build_word",             count: 1 },
          { type: "read_word_pick_picture", count: 1, from: "earlier-steps" }
        ]
      },
      {
        /* v4 — two-word phrases (spaces render as plain separators; the
         * per-word "Sound it out" machinery already handles them) */
        id: "read-8", title: "Little phrases", kind: "phrases",
        items: ["dila_mshvidobisa", "ghame_mshvidobisa", "rogor_khar", "ar_vitsi", "ar_mesmis", "kargi_amindia"],
        practice: [
          { type: "read_word_pick_picture", count: 2 },
          { type: "build_phrase",           count: 2 },
          { type: "hear_pick_word",         count: 1 },
          { type: "match_pairs",            count: 1 }
        ],
        exam: [
          { type: "read_word_pick_picture", count: 2 },
          { type: "build_phrase",           count: 2 },
          { type: "hear_pick_word",         count: 2 },
          { type: "read_word_pick_picture", count: 1, from: "earlier-steps" }
        ]
      }
    ]
  },

  /* ------------------------------------------------------------------ *
   * Praise phrases — short, warm Georgian encouragements played after
   * finishes and good answers. Rewards only; never a scolding variant.
   * ------------------------------------------------------------------ */
  praise: [
    { id: "praise-kargia",         ka: "კარგია!",        translit: "k'argia!",        en: "Good!" },
    { id: "praise-shesanishnavia", ka: "შესანიშნავია!",  translit: "shesanishnavia!", en: "Excellent!" },
    { id: "praise-qochagh",        ka: "ყოჩაღ!",         translit: "q'ochagh!",       en: "Well done!" },
    { id: "praise-magaria",        ka: "მაგარია!",       translit: "magaria!",        en: "Awesome!" },
    /* v3 additions — more variety, same warmth */
    { id: "praise-didebulia",      ka: "დიდებულია!",     translit: "didebulia!",      en: "Wonderful!" },
    { id: "praise-mshvenieria",    ka: "მშვენიერია!",    translit: "mshvenieria!",    en: "Lovely!" },
    { id: "praise-bravo",          ka: "ბრავო!",         translit: "bravo!",          en: "Bravo!" }
  ],

  /* ------------------------------------------------------------------ *
   * Audio ids — every speakable thing maps to exactly one bundled clip:
   *   gamarjoba/audio/ka/<audioId>.mp3   (relative path, no network)
   *
   * Scheme:
   *   - Vocab items, reading extras:  audioId === the item's own id
   *     (e.g. "gamarjoba" → audio/ka/gamarjoba.mp3).
   *   - Syllables:  "syl-<translit>" === the syllable's own id.
   *   - Praise:     the praise entry's own id (praise-kargia, …).
   *   - Letters:    "letter-<translit>", looked up by the letter's `ka`
   *     char in the map below. Filename-safe sanitization: the ejective
   *     apostrophe (') becomes "x" —
   *       k' → kx · p' → px · t' → tx · q' → qx · ts' → tsx · ch' → chx
   *     so ც (ts) → letter-ts but წ (ts') → letter-tsx, etc. All 33 ids
   *     are unique. Letter clips speak the bare letter character.
   * ------------------------------------------------------------------ */
  audioIds: {
    letters: {
      /* group-1 */ "ა": "letter-a",   "ბ": "letter-b",   "გ": "letter-g",   "დ": "letter-d",   "ე": "letter-e",  "ვ": "letter-v",
      /* group-2 */ "ზ": "letter-z",   "თ": "letter-t",   "ი": "letter-i",   "კ": "letter-kx",  "ლ": "letter-l",  "მ": "letter-m",
      /* group-3 */ "ნ": "letter-n",   "ო": "letter-o",   "პ": "letter-px",  "ჟ": "letter-zh",  "რ": "letter-r",  "ს": "letter-s",
      /* group-4 */ "ტ": "letter-tx",  "უ": "letter-u",   "ფ": "letter-p",   "ქ": "letter-k",   "ღ": "letter-gh",
      /* group-5 */ "ყ": "letter-qx",  "შ": "letter-sh",  "ჩ": "letter-ch",  "ც": "letter-ts",  "ძ": "letter-dz",
      /* group-6 */ "წ": "letter-tsx", "ჭ": "letter-chx", "ხ": "letter-kh",  "ჯ": "letter-j",   "ჰ": "letter-h"
    },

    /* Letter example words, keyed by the example's `ka`. Examples whose
     * `ka` equals a vocab item reuse that item's clip automatically (the
     * app checks vocab first), so only the rest live here: ია/ცა/ენა
     * reuse the readingTrack extras' clips, and every other unmatched
     * example gets its own bundled clip, example-<translit>.mp3 —
     * generated by scripts/generate-gamarjoba-audio.py like the rest. */
    examples: {
      "ალუბალი": "example-alubali",   // ა — cherry
      "ბანანი":  "example-banani",    // ბ — banana
      "ზღვა":    "example-zghva",     // ზ — sea
      "ია":      "rw_ia",             // ი — violet (reading extra)
      "ლომი":    "example-lomi",      // ლ — lion
      "ნავი":    "example-navi",      // ნ — boat
      "ოთახი":   "example-otakhi",    // ო — room
      "ჟირაფი":  "example-zhirapi",   // ჟ — giraffe
      "ტბა":     "example-tba",       // ტ — lake
      "უთო":     "example-uto",       // უ — clothes iron
      "ფული":    "example-puli",      // ფ — money
      "ღამე":    "example-ghame",     // ღ — night
      "ყვავილი": "example-qvavili",   // ყ — flower
      "ცა":      "rw_tsa",            // ც — sky (reading extra)
      "ენა":     "rw_ena",            // ე — tongue (reading extra)
      "ჭიქა":    "example-chika",     // ჭ — glass, cup
      "ხე":      "example-khe",       // ხ — tree
      "ჯიბე":    "example-jibe",      // ჯ — pocket
      "ჰაერი":   "example-haeri"      // ჰ — air
    }
  },

  /* ------------------------------------------------------------------ *
   * v3 — Sakartvelo release (all keys below are ADDITIVE; nothing above
   * was renamed, removed, or reordered).
   * ------------------------------------------------------------------ */

  /* Bonus pool — vocab ids that belong to NO unit. They feed the
   * Word-of-the-Day pick (in listed order via date-hash) and, once
   * collected, the practice mixer. Audio clips exist like any vocab. */
  bonusWords: [
    /* numbers 11–20 */
    "tertmeti", "tormeti", "tsameti", "totkhmeti", "tkhutmeti",
    "tekvsmeti", "chvidmeti", "tvrameti", "tskhrameti", "otsi",
    /* everyday things */
    "tsigni", "teleponi", "gasaghebi", "chanta", "kari_door",
    "panjara", "skami", "satsoli", "mankana", "kalami",
    /* nature */
    "varskvlavi", "mtvare", "mdinare", "tqe", "zghva",
    "khe", "qvavili", "baghi", "khidi", "qurdzeni",
    /* v4 — household things (games pool, see C.games) */
    "chika", "kovzi", "changali", "tepshi", "sapone",
    "sarke", "lampa", "divani", "abazana", "chaidani"
  ],

  /* ------------------------------------------------------------------ *
   * Unit exam — ONE generic recipe for every unit (data-driven, like the
   * letters-path exam recipes). 9 questions drawn across the whole
   * unit's items; distractor tiers [unitWords, ALL_WORDS].
   *
   * Positive-only hard rules apply unchanged: 1–3 stars by accuracy but
   * NEVER below 1, always redoable, wrong answers gently shake, reveal
   * and SPEAK the right one. Nothing locks, nothing is taken away.
   *
   *   - `from: "earlier-units"` → review sprinkle drawn from any earlier
   *     unit (the first unit has none, so it draws from itself).
   *   - `fallback` → exercise type to use when the primary type has no
   *     usable material (e.g. nothing buildable for build_word).
   * ------------------------------------------------------------------ */
  unitExamRecipe: [
    { type: "pick_picture",           count: 2 },
    { type: "reverse_pick",           count: 2 },
    { type: "match_pairs",            count: 1 },
    { type: "build_word",             count: 1, fallback: "picture_pick_word" },
    { type: "picture_pick_word",      count: 1 },
    { type: "read_word_pick_picture", count: 1 },
    { type: "pick_picture",           count: 1, from: "earlier-units" }
  ],

  /* ------------------------------------------------------------------ *
   * Sticker album — Baba's daily welcome gifts (and first-time exam-pass
   * / crown gifts) come from this pool IN ORDER, so the album always
   * completes. Append-only collection: stickers are never taken away.
   * All Georgian-flavored, friendly, never scary. Display-only (not
   * spoken), hence no `ka` field — the audio generator skips these.
   * ------------------------------------------------------------------ */
  stickers: [
    { id: "st-khinkali",        emoji: "🥟", name: "Khinkali" },
    { id: "st-khachapuri",      emoji: "🫓", name: "Khachapuri" },
    { id: "st-churchkhela",     emoji: "🍭", name: "Churchkhela" },
    { id: "st-borjgali",        emoji: "☀️", name: "Borjgali sun" },
    { id: "st-tone-puri",       emoji: "🍞", name: "Tone bread" },
    { id: "st-sulguni",         emoji: "🧀", name: "Sulguni cheese" },
    { id: "st-qvevri",          emoji: "🏺", name: "Qvevri jar" },
    { id: "st-qurdzeni",        emoji: "🍇", name: "Georgian grapes" },
    { id: "st-supra",           emoji: "🍽️", name: "Supra table" },
    { id: "st-tbilisi-balcony", emoji: "🏘️", name: "Old Tbilisi balcony" },
    { id: "st-narikala",        emoji: "🏰", name: "Narikala fortress" },
    { id: "st-cable-car",       emoji: "🚡", name: "Tbilisi cable car" },
    { id: "st-sameba",          emoji: "⛪", name: "Sameba cathedral" },
    { id: "st-kazbegi",         emoji: "🏔️", name: "Mount Kazbegi" },
    { id: "st-svan-tower",      emoji: "🗼", name: "Svan tower" },
    { id: "st-vardzia",         emoji: "⛰️", name: "Vardzia cave town" },
    { id: "st-black-sea",       emoji: "🌊", name: "Black Sea" },
    { id: "st-batumi",          emoji: "🌴", name: "Batumi palms" },
    { id: "st-borjomi",         emoji: "💧", name: "Borjomi spring" },
    { id: "st-tusheti",         emoji: "🐑", name: "Tusheti sheep" },
    { id: "st-panduri",         emoji: "🪕", name: "Panduri" },
    { id: "st-doli",            emoji: "🥁", name: "Doli drum" },
    { id: "st-polyphony",       emoji: "🎶", name: "Polyphonic song" },
    { id: "st-tsekva",          emoji: "💃", name: "Georgian dance" },
    { id: "st-chokha",          emoji: "🧥", name: "Chokha coat" },
    { id: "st-mkhedruli",       emoji: "✍️", name: "Mkhedruli letters" },
    { id: "st-pirosmani",       emoji: "🎨", name: "Pirosmani painting" },
    { id: "st-tklapi",          emoji: "🍑", name: "Tklapi fruit roll" },
    { id: "st-pelamushi",       emoji: "🍮", name: "Pelamushi pudding" },
    { id: "st-golden-borjgali", emoji: "🌟", name: "Golden borjgali" }
  ],

  /* ------------------------------------------------------------------ *
   * v4 — Games ("თამაშები"). Supplementary cozy fun, NEVER a replacement
   * for the learning loop and never pressure-based: endless relaxed
   * rounds, no timers, no lives, no locks, no failure end-state. Misses
   * always reveal + SPEAK the right answer (a free learning moment), so
   * nothing is unfair even before study.
   *
   * The "fair for beginners" contract lives HERE: games draw ONLY from
   * these curated id lists — concrete, picturable early vocab.
   *   - findHome.zones: where each thing lives in the room scene (wall /
   *     mid / floor); each round samples `perRound`/3 ids per zone.
   *   - market.itemIds: stall pool; each list is `listLen` of them shown
   *     on a stall of `stallSize`.
   *   - safari: letter pool is progress-aware at runtime (met groups,
   *     union group-1 as floor) — `gridSize` tiles, `copies` targets.
   * ------------------------------------------------------------------ */
  games: {
    findHome: {
      id: "find-home", emoji: "🛋️", title: "Find it at home",
      perRound: 9,   // 3 per zone
      zones: {
        wall:  ["panjara", "sarke", "lampa", "saati", "kari_door"],
        /* no "magida" here: its 🪑 depiction is identical to skami's (chair) —
         * there is no table emoji, so the table stays out of this game pool */
        mid:   ["skami", "divani", "satsoli", "abazana", "teleponi", "chaidani"],
        floor: ["tsigni", "chanta", "kalami", "gasaghebi", "sapone", "chika", "kovzi", "changali", "tepshi"]
      }
    },
    market: {
      id: "market", emoji: "🧺", title: "Market day",
      listLen: 4, stallSize: 8,
      itemIds: ["puri", "qveli", "kvertskhi", "rdze", "shakari", "khachapuri", "khinkali", "vashli",
                "khili", "tsqali", "chai", "qava", "tsveni", "salati", "supi", "khortsi", "naqini",
                "limonati", "qurdzeni"]
    },
    safari: {
      id: "letter-safari", emoji: "🔎", title: "Letter safari",
      gridSize: 16, copies: 3
    }
  },

  /* ------------------------------------------------------------------ *
   * Spoken UI instructions — instruction/copy string → bundled English
   * clip id (audio/ka/<id>.mp3, same folder as everything else; these
   * clips use a warm English child voice, not the Georgian voice).
   * A pre-reader hears the RULE first, then the content prompt.
   * Legacy instruction strings map to the same clips so any un-migrated
   * view keeps talking.
   * ------------------------------------------------------------------ */
  uiAudio: {
    "Tap what you hear":                     "ui-tap-what-you-hear",
    "Tap the Georgian word for:":            "ui-pick-georgian-word",
    "Pick the Georgian word for:":           "ui-pick-georgian-word",  /* legacy */
    "Match the pairs":                       "ui-match-pairs",
    "Build the word":                        "ui-build-the-word",
    "Build what you hear":                   "ui-build-what-you-hear",
    "Tap the letter you hear":               "ui-tap-letter-you-hear",
    "What sound does it make?":              "ui-what-sound",
    "Trace the letter":                      "ui-trace-letter",
    "Read it — then tap its picture":        "ui-read-the-word",
    "Read the word":                         "ui-read-the-word",       /* legacy */
    "Which word says it?":                   "ui-which-word-says-it",
    "Read it first — then the sound unlocks!": "ui-read-first",
    "Almost! Here is the right one.":        "ui-almost",
    "Well done!":                            "ui-well-done",
    "A gift for you!":                       "ui-your-gift",
    /* v4 additions — reading expansion + games. Same rule as everything
     * here: instruction lines stay SILENT unless their line is tapped. */
    "Which word did you hear?":              "ui-which-word-heard",
    "Put the words in order":                "ui-words-in-order",
    "Tap the card to flip it":               "ui-tap-to-flip",
    "Find it in the room!":                  "ui-find-in-room",
    "Find it at the market!":                "ui-find-market",
    "Tap every one you see!":                "ui-tap-all-copies"
  }
};
