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
    reading:          "კითხვა"           // "reading" (Reading path title)
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
    khili:             { id: "khili",             ka: "ხილი",                translit: "khili",                en: "fruit",                    emoji: "🍇" },
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
    kartuli:           { id: "kartuli",           ka: "ქართული",             translit: "kartuli",              en: "Georgian (language)",      emoji: "📖" }
  },

  /* ------------------------------------------------------------------ *
   * Letters path — the 6 alphabet groups, easy → hard. The `alphabet`
   * array order above is canonical; groups here reference it by id and
   * never redefine letters. Three steps per group: meet / write / exam.
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
      { id: "syl-go", ka: "გო", translit: "go" }
    ],
    extras: [   /* tiny dedicated word list, same shape as vocab items */
      { id: "rw_ia",  ka: "ია",  translit: "ia",  en: "violet (flower)", emoji: "🌼" },
      { id: "rw_tsa", ka: "ცა",  translit: "tsa", en: "sky",             emoji: "🌤️" },
      { id: "rw_ena", ka: "ენა", translit: "ena", en: "tongue",          emoji: "👅" }
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
    { id: "praise-magaria",        ka: "მაგარია!",       translit: "magaria!",        en: "Awesome!" }
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
  }
};
