/* Gamarjoba! — app.js
 * Vanilla JS, no frameworks, no modules, no network requests.
 * Router (#/home, #/unit/:id, #/lesson/:id, #/alphabet, #/practice),
 * localStorage store ('gamarjoba.v1'), 4 data-driven exercise renderers.
 * All content strings come from window.CURRICULUM (data.js).
 */

(function () {
  'use strict';

  var C = window.CURRICULUM;
  var $app = document.getElementById('app');
  var $main = document.querySelector('main');
  var $live = document.getElementById('live');
  var $toasts = document.getElementById('toasts');

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ------------------------------------------------------------------ *
   * Store — single localStorage key, private-mode safe.
   * Every counter is monotonic: values only ever go up.
   * ------------------------------------------------------------------ */

  var STORE_KEY = 'gamarjoba.v1';

  function storeDefaults() {
    return {
      xp: 0,
      stars: {},            // lessonId -> best stars (1..3), max-merge only
      practiceStars: 0,     // increment-only
      badges: [],           // increment-only set
      crowns: [],           // unit ids, never revoked
      lastPracticed: {},    // wordId -> timestamp
      letterCardsOpened: [],// letter ka strings opened at least once
      buildFirstTries: 0,   // build_word first-try count (word-builder badge)
      practiceSessions: 0,  // completed practice sessions (practicer badge)
      /* v2 additions — all monotonic, old saves upgrade via the key-merge below */
      lettersMeetDone: [],   // group ids whose "Meet the letters" deck was finished
      lettersTraceDone: [],  // group ids whose tracing step was finished
      lettersTraced: [],     // individual ka chars ever traced (letter-artist badge)
      lettersExamStars: {},  // groupId -> best stars 1..3, max-merge only
      readingCardsDone: [],  // reading step ids
      readingPracticeDone: [], // reading step ids
      readingExamStars: {},  // stepId -> best stars 1..3, max-merge only
      /* v3 additions — all additive; old saves upgrade via the key-merge below */
      unitCardsDone: [],     // lesson ids whose word-cards deck was finished
      unitExamStars: {},     // unitId -> best stars 1..3, max-merge only
      daysPlayed: [],        // ISO "YYYY-MM-DD" strings, append-only, gaps never shown
      stickers: [],          // sticker ids, append-only — never taken away
      wodDate: "",           // date of the current word of the day
      wodId: "",             // its vocab id
      wodCollected: []       // collected word-of-the-day ids, append-only
    };
  }

  function pushOnce(arr, val) {
    if (arr.indexOf(val) === -1) { arr.push(val); return true; }
    return false;
  }

  var state = (function loadState() {
    var s = storeDefaults();
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          Object.keys(s).forEach(function (k) {
            if (p[k] !== undefined && p[k] !== null) { s[k] = p[k]; }
          });
        }
      }
    } catch (e) { /* private mode / blocked storage: run in-memory */ }
    return s;
  })();

  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* in-memory fallback */ }
  }

  /* ------------------------------------------------------------------ *
   * Tiny DOM helpers
   * ------------------------------------------------------------------ */

  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) { return; }
        if (k === 'class') { el.className = v; }
        else if (k === 'text') { el.textContent = v; }
        else if (k === 'html') { el.innerHTML = v; } // static, trusted markup only
        else if (k.indexOf('on') === 0 && typeof v === 'function') { el.addEventListener(k.slice(2), v); }
        else { el.setAttribute(k, v === true ? '' : String(v)); }
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) { return; }
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function kaSpan(text, cls) {
    return h('span', { 'class': 'ka' + (cls ? ' ' + cls : ''), lang: 'ka', text: text });
  }

  function emojiSpan(emoji, label, cls) {
    return h('span', { 'class': cls || '', role: 'img', 'aria-label': label, text: emoji });
  }

  function borjgaliSvg(cls) {
    return h('span', {
      'class': cls || '',
      'aria-hidden': 'true',
      html: '<svg class="borjgali" viewBox="0 0 100 100" focusable="false" style="width:100%;height:100%"><use href="#borjgali"></use></svg>'
    });
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function announce(msg) {
    $live.textContent = '';
    // force a fresh announcement even for repeated text
    window.setTimeout(function () { $live.textContent = msg; }, 30);
  }

  /* opts.keep — survives exactly one navigation (e.g. "saved" on exit) */
  function toast(msg, opts) {
    var t = h('div', { 'class': 'toast' + (opts && opts.keep ? ' toast--keep' : ''), text: msg });
    $toasts.appendChild(t);
    window.setTimeout(function () {
      t.classList.add('out');
      window.setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 350);
    }, 2600);
  }

  /* ------------------------------------------------------------------ *
   * Speech — find a Georgian voice; hide audio controls if absent.
   * ------------------------------------------------------------------ */

  var kaVoice = null;

  function detectVoice() {
    kaVoice = null;
    try {
      if ('speechSynthesis' in window) {
        var voices = window.speechSynthesis.getVoices() || [];
        for (var i = 0; i < voices.length; i++) {
          var lang = (voices[i].lang || '').toLowerCase();
          if (lang === 'ka' || lang.indexOf('ka-') === 0 || lang.indexOf('ka_') === 0) {
            kaVoice = voices[i];
            break;
          }
        }
      }
    } catch (e) { kaVoice = null; }
    document.body.classList.toggle('no-voice', !kaVoice);
  }

  function hasVoice() { return !!kaVoice; }

  function speak(text, thenFn) {
    if (!kaVoice) { if (thenFn) { thenFn(); } return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.voice = kaVoice;
      u.lang = kaVoice.lang;
      u.rate = 0.85;
      if (thenFn) { u.onend = thenFn; }
      window.speechSynthesis.speak(u);
    } catch (e) { if (thenFn) { thenFn(); } /* stay silent */ }
  }

  function stopSpeech() {
    try { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); } } catch (e) {}
  }

  detectVoice();
  try {
    if ('speechSynthesis' in window && typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', detectVoice);
    }
  } catch (e) {}

  /* ------------------------------------------------------------------ *
   * Bundled MP3 clips — audio/ka/<audioId>.mp3, relative paths only.
   * MP3-first, speechSynthesis fallback, silent no-op if neither.
   * window.AUDIO_FILES (audio-map.js) says which clips exist.
   * ------------------------------------------------------------------ */

  var AUDIO_SET = {};
  (window.AUDIO_FILES || []).forEach(function (id) { AUDIO_SET[id] = true; });

  var audioCache = {};  // audioId -> HTMLAudioElement
  var audioBad = {};    // audioId -> true once the file 404s / errors
  var currentClip = null;

  /* thenFn (optional) fires once when the clip/utterance finishes — used to
   * chain speech and to let a miss reveal finish before auto-advancing */
  function playAudio(audioId, kaText, thenFn) {
    stopSpeech();
    if (currentClip) { try { currentClip.pause(); } catch (e) {} }
    if (!audioId || audioBad[audioId] || !AUDIO_SET[audioId]) { speak(kaText, thenFn); return; }
    var a = audioCache[audioId];
    if (!a) {
      a = new Audio('audio/ka/' + audioId + '.mp3');
      a.preload = 'auto';
      a.addEventListener('error', function () { audioBad[audioId] = true; });
      audioCache[audioId] = a;
    }
    a.onended = thenFn || null; // assignment, not addEventListener — one live handler
    currentClip = a;
    try {
      a.currentTime = 0;
      var p = a.play();
      if (p && p.catch) { p.catch(function () { /* autoplay blocked: stay quiet */ }); }
    } catch (e) { speak(kaText, thenFn); }
  }

  function letterAudioId(letter) {
    return (C.audioIds && C.audioIds.letters && C.audioIds.letters[letter.ka]) || null;
  }

  function playWord(w) { playAudio(w.id, w.ka); }
  function playLetter(l) { playAudio(letterAudioId(l), l.ka); }

  /* letters have no `id`; anything speakable goes through here */
  function playItem(item, thenFn) {
    if (!item) { if (thenFn) { thenFn(); } return; }
    var aid = item.id;
    if (!aid && C.audioIds && C.audioIds.letters && C.audioIds.letters[item.ka]) {
      aid = C.audioIds.letters[item.ka];
    }
    playAudio(aid, item.ka, thenFn);
  }

  function playPraise() {
    var list = C.praise || [];
    if (!list.length) { return; }
    var p = list[Math.floor(Math.random() * list.length)];
    playAudio(p.id, p.ka);
    return p;
  }

  /* AudioButton — the one way to put a 🔊 next to a word or letter.
   * Secondary control: never selects/submits an answer (stopPropagation),
   * keyboard reachable like any button. */
  function audioBtn(audioId, kaText, opts) {
    var cls = 'speak-btn';
    if (opts && opts.small) { cls += ' speak-btn--sm'; }
    if (opts && opts.lg) { cls += ' speak-btn--lg'; }
    return h('button', {
      'class': cls,
      type: 'button',
      'aria-label': (opts && opts.label) || 'Listen',
      onclick: function (e) { e.stopPropagation(); playAudio(audioId, kaText); }
    }, [h('span', { 'aria-hidden': 'true', text: '🔊' })]);
  }

  /* legacy shim — plain speech-only button */
  function speakBtn(text, label) {
    return audioBtn(null, text, { label: label });
  }

  function sayHint(translit) {
    return h('span', { 'class': 'say-hint', text: 'say it: ' + translit });
  }

  /* ------------------------------------------------------------------ *
   * Spoken UI instructions (v3, H1) — every .instruction is a button that
   * replays its own English clip. On render the rule plays first, then
   * the content prompt (chained on `ended`, 1800ms fallback).
   * ------------------------------------------------------------------ */

  var uiClipCache = {};

  function playUiClip(text, thenFn, fallbackMs) {
    var aid = (C.uiAudio && C.uiAudio[text]) || null;
    var fired = false;
    function fireOnce() { if (!fired) { fired = true; if (thenFn) { thenFn(); } } }
    if (!aid || audioBad[aid] || !AUDIO_SET[aid]) { fireOnce(); return; }
    stopSpeech();
    if (currentClip) { try { currentClip.pause(); } catch (e) {} }
    var a = uiClipCache[aid];
    if (!a) {
      a = new Audio('audio/ka/' + aid + '.mp3');
      a.preload = 'auto';
      a.addEventListener('error', function () { audioBad[aid] = true; });
      uiClipCache[aid] = a;
    }
    a.onended = fireOnce; // assignment, not addEventListener — one live handler
    currentClip = a;
    try {
      a.currentTime = 0;
      var p = a.play();
      if (p && p.catch) { p.catch(function () { /* autoplay blocked: fallback timer fires */ }); }
    } catch (e) { /* stay quiet */ }
    window.setTimeout(fireOnce, fallbackMs || 1800); // never leave the content prompt unspoken
  }

  /* the one way to put an instruction line on screen: a replayable button */
  function instructionLine(text) {
    return h('button', {
      'class': 'instruction',
      type: 'button',
      'data-inst': text,
      'aria-label': text + ' — tap to hear the instruction again',
      onclick: function () { playUiClip(text); }
    }, [
      h('span', { text: text }),
      h('span', { 'class': 'instruction-speaker', 'aria-hidden': 'true', text: '🔊' })
    ]);
  }

  /* rule clip first, then the content prompt — skipped if the view is gone */
  function speakThen(container, text, fn) {
    playUiClip(text, function () {
      if (fn && document.body.contains(container)) { fn(); }
    });
  }

  /* track input modality so keyboard-only hints appear only for keyboard users */
  var lastInputKeyboard = false;
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Tab' || (e.key && e.key.indexOf('Arrow') === 0) || (e.key >= '1' && e.key <= '9')) {
      lastInputKeyboard = true;
    }
  }, true);
  document.addEventListener('pointerdown', function () { lastInputKeyboard = false; }, true);

  function kbdHint() {
    if (!lastInputKeyboard) { return null; }
    return h('p', { 'class': 'kbd-hint', text: 'Tip: keys 1–4 answer' });
  }

  /* ------------------------------------------------------------------ *
   * Gentle sounds — WebAudio oscillator, no files, no network.
   * ------------------------------------------------------------------ */

  var audioCtx = null;

  function playNotes(notes) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { return; }
      if (!audioCtx) { audioCtx = new AC(); }
      if (audioCtx.state === 'suspended' && audioCtx.resume) { audioCtx.resume(); }
      var t0 = audioCtx.currentTime;
      notes.forEach(function (n) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = n.f;
        gain.gain.setValueAtTime(0.0001, t0 + n.t);
        gain.gain.exponentialRampToValueAtTime(0.12, t0 + n.t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.t + n.d);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t0 + n.t);
        osc.stop(t0 + n.t + n.d + 0.05);
      });
    } catch (e) { /* sound is optional */ }
  }

  function chime() { playNotes([{ f: 784, t: 0, d: 0.18 }, { f: 1174.66, t: 0.12, d: 0.28 }]); }
  function boop() { playNotes([{ f: 196, t: 0, d: 0.22 }]); }

  /* ------------------------------------------------------------------ *
   * Curriculum helpers
   * ------------------------------------------------------------------ */

  var ALL_WORDS = Object.keys(C.vocab).map(function (id) { return C.vocab[id]; });
  var ALL_LETTERS = [];
  C.alphabet.forEach(function (g) { g.letters.forEach(function (l) { ALL_LETTERS.push(l); }); });

  function wordsOf(ids) {
    return ids.map(function (id) { return C.vocab[id]; }).filter(function (w) { return !!w; });
  }

  function unitWords(unit) {
    var ids = [];
    unit.lessons.forEach(function (l) { ids = ids.concat(l.items); });
    return wordsOf(ids);
  }

  function findUnit(unitId) {
    for (var i = 0; i < C.units.length; i++) {
      if (C.units[i].id === unitId) { return C.units[i]; }
    }
    return null;
  }

  function findLesson(lessonId) {
    for (var i = 0; i < C.units.length; i++) {
      var u = C.units[i];
      for (var j = 0; j < u.lessons.length; j++) {
        if (u.lessons[j].id === lessonId) { return { unit: u, lesson: u.lessons[j], index: j }; }
      }
    }
    return null;
  }

  function lessonsDone(unit) {
    var n = 0;
    unit.lessons.forEach(function (l) { if ((state.stars[l.id] || 0) >= 1) { n++; } });
    return n;
  }

  function unitCompleted(unit) { return lessonsDone(unit) === unit.lessons.length; }

  function unitUpcoming(index) {
    if (index === 0) { return false; }
    return lessonsDone(C.units[index - 1]) === 0;
  }

  function learnedWords() {
    var ids = [];
    C.units.forEach(function (u) {
      u.lessons.forEach(function (l) {
        if ((state.stars[l.id] || 0) >= 1 || state.unitCardsDone.indexOf(l.id) !== -1) { ids = ids.concat(l.items); }
      });
    });
    // collected words of the day join the practice mixer too
    ids = ids.concat(state.wodCollected.filter(function (id) { return !!C.vocab[id]; }));
    if (ids.length === 0) { ids = C.units[0].lessons[0].items.slice(); }
    var seen = {};
    return wordsOf(ids).filter(function (w) {
      if (seen[w.id]) { return false; }
      seen[w.id] = true;
      return true;
    });
  }

  function learnedLetterSet() {
    var set = {};
    C.units.forEach(function (u) {
      u.lessons.forEach(function (l) {
        if ((state.stars[l.id] || 0) >= 1) {
          wordsOf(l.items).forEach(function (w) {
            String(w.ka).split('').forEach(function (ch) {
              if (ch >= 'ა' && ch <= 'ჿ') { set[ch] = true; }
            });
          });
        }
      });
    });
    return set;
  }

  function isBuildable(word) {
    return /^[ა-ჿ]{3,7}$/.test(word.ka);
  }

  /* pick n distractors for `word`, trying each tier of words in order */
  function pickDistractors(word, n, tiers) {
    var out = [];
    var seenId = {}; seenId[word.id] = true;
    var seenEn = {}; seenEn[word.en] = true;
    for (var t = 0; t < tiers.length && out.length < n; t++) {
      var cand = shuffle(tiers[t]);
      for (var i = 0; i < cand.length && out.length < n; i++) {
        var w = cand[i];
        if (seenId[w.id] || seenEn[w.en]) { continue; }
        seenId[w.id] = true;
        seenEn[w.en] = true;
        out.push(w);
      }
    }
    return out;
  }

  /* ------------------------------------------------------------------ *
   * Rewards — XP, stars, crowns, badges. Monotonic only.
   * ------------------------------------------------------------------ */

  var BADGES = {
    'first-lesson':      { emoji: '🎒', name: 'First lesson' },
    'first-crown':       { emoji: '👑', name: 'First crown' },
    'alphabet-explorer': { emoji: '🔤', name: 'Alphabet explorer' },
    'word-builder':      { emoji: '🧱', name: 'Word builder' },
    'practicer':         { emoji: '🏃', name: 'Practicer' },
    'letter-artist':     { emoji: '✍️', name: 'Letter artist' },
    'first-reader':      { emoji: '📖', name: 'First reader' }
  };

  function totalStars() {
    var t = state.practiceStars || 0;
    Object.keys(state.stars).forEach(function (k) { t += state.stars[k] || 0; });
    Object.keys(state.lettersExamStars).forEach(function (k) { t += state.lettersExamStars[k] || 0; });
    Object.keys(state.readingExamStars).forEach(function (k) { t += state.readingExamStars[k] || 0; });
    Object.keys(state.unitExamStars).forEach(function (k) { t += state.unitExamStars[k] || 0; });
    return t;
  }

  /* XP milestones — celebrated when crossed, never lost (XP only goes up) */
  var XP_MILESTONES = [
    { at: 500,  label: '🥉 Bronze borjgali' },
    { at: 1500, label: '🥈 Silver borjgali' },
    { at: 3000, label: '🥇 Golden borjgali' }
  ];

  var shownStats = { stars: null, xp: null };

  function popChip(chip) {
    chip.classList.remove('pop');
    // restart the animation
    void chip.offsetWidth;
    chip.classList.add('pop');
  }

  function updateChips() {
    var stars = totalStars();
    var xp = state.xp;
    var chipStars = document.getElementById('chip-stars');
    var chipXp = document.getElementById('chip-xp');
    document.getElementById('stars-val').textContent = String(stars);
    document.getElementById('xp-val').textContent = String(xp);
    chipStars.setAttribute('aria-label', 'Total stars: ' + stars + ' — open My treasures');
    chipXp.setAttribute('aria-label', 'Total XP: ' + xp + ' — open My treasures');
    if (shownStats.stars !== null && stars > shownStats.stars) { popChip(chipStars); }
    if (shownStats.xp !== null && xp > shownStats.xp) { popChip(chipXp); }
    shownStats.stars = stars;
    shownStats.xp = xp;
  }

  function addXP(n) {
    if (n <= 0) { return; }
    var before = state.xp;
    state.xp += n;
    save();
    updateChips();
    XP_MILESTONES.forEach(function (m) {
      if (before < m.at && state.xp >= m.at) {
        toast(m.label + ' — ' + m.at + ' XP! 🎉');
        announce('Milestone reached: ' + m.label + ', ' + m.at + ' XP!');
        var view = $app.querySelector('.view');
        if (view) { confettiBurst(view); }
      }
    });
  }

  function earnBadge(id) {
    if (state.badges.indexOf(id) !== -1) { return; }
    state.badges.push(id);
    save();
    var b = BADGES[id];
    if (b) {
      toast('New badge: ' + b.name + '! 🎉');
      announce('New badge earned: ' + b.name);
    }
  }

  /* v3 — cards node counts done for anyone who already passed practice
   * (old saves are never sent back to flashcards). Monotonic. */
  function cardsNodeDone(lessonId) {
    return state.unitCardsDone.indexOf(lessonId) !== -1 || (state.stars[lessonId] || 0) >= 1;
  }

  function unitNodeCounts(unit) {
    var total = unit.lessons.length * 2 + 1;
    var done = 0;
    unit.lessons.forEach(function (l) {
      if (cardsNodeDone(l.id)) { done++; }
      if ((state.stars[l.id] || 0) >= 1) { done++; }
    });
    if ((state.unitExamStars[unit.id] || 0) >= 1) { done++; }
    return { done: done, total: total };
  }

  /* Sticker album — daily gifts, first exam passes and crowns all draw
   * from C.stickers IN ORDER, so the album always completes. Append-only. */
  function nextSticker() {
    var list = C.stickers || [];
    for (var i = 0; i < list.length; i++) {
      if (state.stickers.indexOf(list[i].id) === -1) { return list[i]; }
    }
    return null;
  }

  function grantSticker(quiet) {
    var st = nextSticker();
    if (!st) { return null; }
    state.stickers.push(st.id);
    save();
    if (!quiet) {
      toast('🎁 New sticker: ' + st.emoji + ' ' + st.name + '!');
      announce('New sticker for your album: ' + st.name);
    }
    return st;
  }

  /* Crowns celebrate the whole unit: every lesson ≥1★ AND the unit exam
   * passed. Existing crowns persist forever — the array is never filtered. */
  function maybeCrown(unit) {
    if (state.crowns.indexOf(unit.id) !== -1) { return; }
    if (!unitCompleted(unit)) { return; }
    if ((state.unitExamStars[unit.id] || 0) < 1) { return; }
    state.crowns.push(unit.id);
    save();
    toast('👑 ' + unit.title + ' complete!');
    earnBadge('first-crown');
    grantSticker();
  }

  /* ------------------------------------------------------------------ *
   * Router
   * ------------------------------------------------------------------ */

  var activeSession = null;

  function navigate(hash) {
    if (window.location.hash === hash) { route(); }
    else { window.location.hash = hash; }
  }

  function setView(section, mainClass) {
    activeSession = null;
    stopSpeech();
    /* toasts never outlive their view (M3) — except one marked to survive
     * a single navigation (the exit "saved" toast) */
    Array.prototype.slice.call($toasts.children).forEach(function (t) {
      if (t.classList.contains('toast--keep')) { t.classList.remove('toast--keep'); }
      else if (t.parentNode) { t.parentNode.removeChild(t); }
    });
    announce('');
    $main.className = mainClass || '';
    $app.innerHTML = '';
    $app.appendChild(section);
    window.scrollTo(0, 0);
    var heading = section.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus();
    }
  }

  function route() {
    var hash = window.location.hash || '#/home';
    var m;
    if (hash === '' || hash === '#' || hash === '#/' || hash === '#/home' || hash === '#home') {
      renderHome();
    } else if ((m = hash.match(/^#\/unit\/([\w-]+)\/cards\/([\w-]+)$/))) {
      renderUnitCards(m[1], m[2]);
    } else if ((m = hash.match(/^#\/unit\/([\w-]+)\/exam$/))) {
      startUnitExam(m[1]);
    } else if ((m = hash.match(/^#\/unit\/([\w-]+)$/))) {
      renderUnit(m[1]);
    } else if (hash === '#/treasures') {
      renderTreasures();
    } else if ((m = hash.match(/^#\/lesson\/([\w-]+)$/))) {
      renderLessonRoute(m[1]);
    } else if (hash === '#/alphabet' || hash === '#alphabet') {
      renderAlphabet();
    } else if (hash === '#/letters') {
      renderLettersPath();
    } else if ((m = hash.match(/^#\/letters\/([\w-]+)\/(meet|trace|exam)$/))) {
      if (m[2] === 'meet') { renderMeet(m[1]); }
      else if (m[2] === 'trace') { renderTrace(m[1]); }
      else { startLettersExam(m[1]); }
    } else if (hash === '#/reading') {
      renderReadingPath();
    } else if ((m = hash.match(/^#\/reading\/([\w-]+)\/(cards|practice|exam)$/))) {
      if (m[2] === 'cards') { renderReadingCards(m[1]); }
      else if (m[2] === 'practice') { startReadingPractice(m[1]); }
      else { startReadingExam(m[1]); }
    } else if (hash === '#/practice' || hash === '#practice' || hash === '#/review') {
      renderPractice();
    } else {
      renderHome();
    }
  }

  window.addEventListener('hashchange', route);

  /* ------------------------------------------------------------------ *
   * Home — adventure path
   * ------------------------------------------------------------------ */

  function entryCard(emoji, kaLabel, enLabel, sub, hash, ariaLabel, ring) {
    var emojiBit;
    if (ring) {
      emojiBit = h('span', { 'class': 'entry-ring', 'aria-hidden': 'true' });
      emojiBit.insertAdjacentHTML('beforeend', ringSvg(ring.frac, ring.done));
      emojiBit.appendChild(h('span', { 'class': 'entry-emoji', text: emoji }));
    } else {
      emojiBit = h('span', { 'class': 'entry-emoji', 'aria-hidden': 'true', text: emoji });
    }
    return h('button', {
      'class': 'entry-card',
      type: 'button',
      'aria-label': ariaLabel,
      onclick: function () { navigate(hash); }
    }, [
      emojiBit,
      h('span', {}, [
        kaSpan(kaLabel), ' · ' + enLabel,
        h('span', { 'class': 'entry-sub', text: sub })
      ]),
      h('span', { 'class': 'chevron', 'aria-hidden': 'true', text: '›' })
    ]);
  }

  /* ---------- v3 retention helpers ---------- */

  function todayKey() {
    var d = new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  /* ONE global next step across the course units (H5). Never a lock —
   * just the friendliest place to tap next. */
  function computeNextStep() {
    for (var i = 0; i < C.units.length; i++) {
      var u = C.units[i];
      for (var j = 0; j < u.lessons.length; j++) {
        var l = u.lessons[j];
        if (!cardsNodeDone(l.id)) {
          return { hash: '#/unit/' + u.id + '/cards/' + l.id, nodeTitle: 'Word cards', unit: u, lesson: l };
        }
        if ((state.stars[l.id] || 0) < 1) {
          return { hash: '#/lesson/' + l.id, nodeTitle: 'Practice', unit: u, lesson: l };
        }
      }
      if ((state.unitExamStars[u.id] || 0) < 1) {
        return { hash: '#/unit/' + u.id + '/exam', nodeTitle: 'Unit exam', unit: u, lesson: null };
      }
    }
    return null;
  }

  /* deterministic word of the day: date-hash over un-collected bonus words
   * first (so the bonus pool completes), then the whole vocabulary */
  function wordOfDay() {
    var k = todayKey();
    if (state.wodDate === k && state.wodId && C.vocab[state.wodId]) { return C.vocab[state.wodId]; }
    var pool = (C.bonusWords || []).filter(function (id) {
      return C.vocab[id] && state.wodCollected.indexOf(id) === -1;
    });
    var ids = pool.length ? pool : Object.keys(C.vocab);
    var hsh = 0;
    for (var i = 0; i < k.length; i++) { hsh = (hsh * 31 + k.charCodeAt(i)) % 1000003; }
    var id = ids[hsh % ids.length];
    state.wodDate = k;
    state.wodId = id;
    save();
    return C.vocab[id];
  }

  function lettersGroupsDone() {
    var n = 0;
    ((C.lettersPath && C.lettersPath.groups) || []).forEach(function (g) {
      if (state.lettersMeetDone.indexOf(g.groupId) !== -1 &&
          state.lettersTraceDone.indexOf(g.groupId) !== -1 &&
          (state.lettersExamStars[g.groupId] || 0) >= 1) { n++; }
    });
    return n;
  }

  function readingStepsDone() {
    var n = 0;
    ((C.readingTrack && C.readingTrack.steps) || []).forEach(function (st) {
      if (state.readingCardsDone.indexOf(st.id) !== -1 &&
          state.readingPracticeDone.indexOf(st.id) !== -1 &&
          (state.readingExamStars[st.id] || 0) >= 1) { n++; }
    });
    return n;
  }

  function ringSvg(frac, done) {
    var r = 50;
    var circ = 2 * Math.PI * r;
    var dash = (circ * Math.min(1, Math.max(0, frac))).toFixed(2) + ' ' + circ.toFixed(2);
    return '<svg class="ring" viewBox="0 0 108 108" aria-hidden="true" focusable="false">' +
      '<circle class="ring-track" cx="54" cy="54" r="' + r + '"></circle>' +
      '<circle class="ring-fill' + (done ? ' done' : '') + '" cx="54" cy="54" r="' + r + '"' +
      ' stroke-dasharray="' + dash + '" transform="rotate(-90 54 54)"></circle></svg>';
  }

  function renderHome() {
    var sec = h('section', { 'class': 'view home', role: 'region', 'aria-label': 'Home' });
    sec.appendChild(h('h1', { text: 'Your Georgian adventure' }));

    /* --- hero: continue your adventure (H5 + 4-1) --- */
    var next = computeNextStep();
    var started = state.xp > 0 || totalStars() > 0 || state.unitCardsDone.length > 0;
    var day = Math.max(1, state.daysPlayed.length);
    var heroLine = next
      ? (started ? 'Keep going: ' : 'Start here: ') + next.unit.emoji + ' ' + next.nodeTitle +
        (next.lesson ? ' · ' + next.lesson.title : '') + ' — ' + next.unit.title
      : 'Every unit done — mix everything in Practice!';
    sec.appendChild(h('button', {
      'class': 'hero-card',
      type: 'button',
      'aria-label': 'Day ' + day + ' of your adventure. ' + heroLine,
      onclick: function () { navigate(next ? next.hash : '#/practice'); }
    }, [
      h('span', { 'class': 'hero-day', text: '☀️ Day ' + day + ' of your adventure' }),
      h('span', { 'class': 'hero-next', text: heroLine }),
      h('span', { 'class': 'chevron', 'aria-hidden': 'true', text: '›' })
    ]));

    /* --- 3 newest badges as quiet chips under the hero (M6) --- */
    if (state.badges.length) {
      var row = h('div', { 'class': 'badges-row badges-row--mini', role: 'list', 'aria-label': 'Newest badges' });
      state.badges.slice(-3).forEach(function (id) {
        var b = BADGES[id];
        if (!b) { return; }
        row.appendChild(h('span', {
          'class': 'badge-chip', role: 'listitem', 'aria-label': 'Badge: ' + b.name
        }, [h('span', { 'aria-hidden': 'true', text: b.emoji }), h('span', { text: b.name })]));
      });
      sec.appendChild(row);
    }

    /* --- word of the day (4-4) --- */
    var w = wordOfDay();
    if (w) {
      var owned = state.wodCollected.indexOf(w.id) !== -1;
      var collectBtn = h('button', {
        'class': 'btn ' + (owned ? 'btn-secondary' : 'btn-primary'),
        type: 'button',
        'aria-label': owned ? w.en + ' is in your dictionary' : 'Collect ' + w.en + ' into your dictionary',
        onclick: function () {
          if (state.wodCollected.indexOf(w.id) !== -1) { navigate('#/treasures'); return; }
          pushOnce(state.wodCollected, w.id);
          save();
          addXP(5);
          collectBtn.textContent = '✓ In your dictionary';
          collectBtn.className = 'btn btn-secondary';
          collectBtn.classList.add('anim-pop');
          toast('Added to your dictionary! 📖');
          announce(w.en + ' added to your dictionary.');
        }
      }, [owned ? '✓ In your dictionary' : 'Collect it ✓']);
      sec.appendChild(h('div', { 'class': 'wod-card' }, [
        h('h2', { 'class': 'wod-title' }, [kaSpan(C.strings.wordOfDay), ' · Word of the day']),
        h('div', { 'class': 'wod-row' }, [
          emojiSpan(w.emoji, w.en, 'wod-emoji'),
          h('span', { 'class': 'wod-ka' }, [kaSpan(w.ka)]),
          audioBtn(w.id, w.ka, { label: 'Hear ' + w.en })
        ]),
        h('p', { 'class': 'translit', text: w.translit + ' — ' + w.en }),
        collectBtn
      ]));
    }

    /* --- entry cards with live progress subs (H6) --- */
    var nGroups = ((C.lettersPath && C.lettersPath.groups) || []).length;
    var gDone = lettersGroupsDone();
    var nSteps = ((C.readingTrack && C.readingTrack.steps) || []).length;
    var sDone = readingStepsDone();
    var nReady = learnedWords().length;
    sec.appendChild(entryCard('🔤', C.strings.letters, 'Letters',
      gDone + ' of ' + nGroups + ' groups done · all 33 letters, step by step', '#/letters',
      'Open the Letters path — ' + gDone + ' of ' + nGroups + ' groups done',
      { frac: nGroups ? gDone / nGroups : 0, done: nGroups > 0 && gDone === nGroups }));
    sec.appendChild(entryCard('📖', C.strings.reading, 'Reading',
      sDone + ' of ' + nSteps + ' steps done · sound out real words', '#/reading',
      'Open the Reading path — ' + sDone + ' of ' + nSteps + ' steps done',
      { frac: nSteps ? sDone / nSteps : 0, done: nSteps > 0 && sDone === nSteps }));
    sec.appendChild(entryCard('🧠', C.strings.practice, 'Practice',
      'Mix everything you know — ' + nReady + ' words ready', '#/practice',
      'Practice everything you have learned — ' + nReady + ' words ready'));
    sec.appendChild(entryCard('🏆', C.strings.treasures, 'My treasures',
      totalStars() + ' stars · ' + state.stickers.length + ' stickers · ' + state.badges.length + ' badges',
      '#/treasures', 'Open My treasures'));

    /* --- unit path, in two labeled parts so 16 units stay scannable --- */
    var path = h('ol', { 'class': 'home-path' });
    C.units.forEach(function (u, i) {
      if (i === 0) {
        path.appendChild(h('li', { 'class': 'path-section' }, [h('span', { text: 'Part 1 · First words' })]));
      } else if (i === 8 && C.units.length > 8) {
        path.appendChild(h('li', { 'class': 'path-section' }, [h('span', { text: 'Part 2 · Out & about' })]));
      }
      var counts = unitNodeCounts(u);
      var crowned = state.crowns.indexOf(u.id) !== -1;
      var completed = crowned || counts.done === counts.total;
      var isNext = !!next && next.unit.id === u.id;

      var bubble = h('button', {
        'class': 'unit-bubble' + (completed ? ' completed' : '') + (isNext ? ' current' : ''),
        type: 'button',
        'aria-label': 'Unit: ' + u.title + ', ' + counts.done + ' of ' + counts.total + ' steps complete' +
          (crowned ? ', crowned' : '') + (isNext ? ', up next' : ''),
        onclick: (function (unitId) { return function () { navigate('#/unit/' + unitId); }; })(u.id)
      });
      bubble.insertAdjacentHTML('beforeend', ringSvg(counts.total ? counts.done / counts.total : 0, completed));
      bubble.appendChild(h('span', { 'class': 'bubble-face', 'aria-hidden': 'true', text: u.emoji }));
      if (crowned) {
        bubble.appendChild(h('span', { 'class': 'unit-crown', 'aria-hidden': 'true', text: '👑' }));
      }
      if (isNext) {
        bubble.appendChild(h('span', { 'class': 'next-pill', text: 'Up next' }));
      }

      var stop = h('div', { 'class': 'unit-stop' }, [
        bubble,
        h('span', { 'class': 'unit-title', text: u.title }),
        h('span', { 'class': 'unit-sub', text: counts.done + ' / ' + counts.total + ' steps' })
      ]);
      path.appendChild(h('li', { 'class': 'unit-node' }, [stop]));
    });
    sec.appendChild(path);

    var mark = borjgaliSvg('watermark');
    sec.appendChild(mark);

    setView(sec, 'wide-home');
  }

  /* ------------------------------------------------------------------ *
   * Unit page — lesson list
   * ------------------------------------------------------------------ */

  function starsRow(n) {
    var row = h('span', { 'class': 'lesson-stars', 'aria-label': n + ' of 3 stars earned' });
    for (var i = 0; i < 3; i++) {
      row.appendChild(h('span', {
        'class': i < n ? 'earned' : 'unearned',
        'aria-hidden': 'true',
        text: i < n ? '★' : '☆'
      }));
    }
    return row;
  }

  /* deterministic count of a lesson's practice exercises (shuffles change
   * order, never counts) — used for honest "~N playful steps" subs */
  function lessonExerciseCount(unit, lesson) {
    var items = wordsOf(lesson.items);
    var n = items.length;                                    // pick_picture per item
    n += Math.max(1, Math.min(items.length, 8 - items.length - 2)); // reverse picks
    var pairWords = padPairWords(items.slice(), [items, unitWords(unit), ALL_WORDS], 5);
    if (pairWords.length >= 3) { n += 1; }                   // match_pairs
    if (items.filter(isBuildable).length) { n += 1; }        // build_word
    if (C.units.indexOf(unit) >= 3) { n += 2; }              // reading pair
    return n;
  }

  function unitExamQuestionCount() {
    return (C.unitExamRecipe || []).reduce(function (n, r) { return n + (r.count || 1); }, 0);
  }

  /* Unit page — a learn → practice → exam step path per lesson, same
   * mental model as the Letters and Reading paths. Nothing is locked. */
  function renderUnit(unitId) {
    var unit = findUnit(unitId);
    if (!unit) { renderHome(); return; }

    var sec = h('section', { 'class': 'view unit-view', role: 'region', 'aria-label': 'Unit: ' + unit.title });
    sec.appendChild(backLink('All units', '#/home'));
    sec.appendChild(h('h1', {}, [
      h('span', { 'aria-hidden': 'true', text: unit.emoji }), ' ' + unit.title
    ]));
    sec.appendChild(h('p', { 'class': 'unit-desc', text: unit.description }));

    var nextFound = false;
    function claimNext(done) {
      if (!done && !nextFound) { nextFound = true; return true; }
      return false;
    }

    unit.lessons.forEach(function (l, li) {
      sec.appendChild(h('h2', { 'class': 'path-group-title', text: (li + 1) + ' · ' + l.title }));
      var ol = h('ol', { 'class': 'step-path' });

      var cardsDone = cardsNodeDone(l.id);
      var earned = state.stars[l.id] || 0;
      var practiceDone = earned >= 1;
      var cardsNext = claimNext(cardsDone);
      var practiceNext = claimNext(practiceDone);
      var stepCount = lessonExerciseCount(unit, l);

      ol.appendChild(pathNode({
        face: h('span', { 'class': 'node-emoji', text: '🃏' }),
        title: 'Word cards',
        sub: l.items.length + ' cards',
        done: cardsDone, next: cardsNext,
        hash: '#/unit/' + unit.id + '/cards/' + l.id,
        aria: 'Word cards — ' + l.title + ', ' + l.items.length + ' cards' +
          (cardsDone ? ', completed' : cardsNext ? ', up next' : '')
      }));
      ol.appendChild(pathNode({
        face: h('span', { 'class': 'node-emoji', text: '🧩' }),
        title: 'Practice',
        sub: practiceDone ? starsRow(earned) : '~' + stepCount + ' playful steps',
        done: practiceDone, next: practiceNext,
        hash: '#/lesson/' + l.id,
        aria: 'Practice — ' + l.title +
          (practiceDone ? ', completed, best ' + earned + ' of 3 stars' : practiceNext ? ', up next' : '')
      }));
      sec.appendChild(ol);
    });

    var examStars = state.unitExamStars[unit.id] || 0;
    var examDone = examStars >= 1;
    var examNext = claimNext(examDone);
    var examOl = h('ol', { 'class': 'step-path' });
    examOl.appendChild(pathNode({
      face: h('span', { 'class': 'node-emoji', text: '🏅' }),
      title: 'Unit exam',
      sub: examDone ? starsRow(examStars) : 'About ' + unitExamQuestionCount() + ' questions',
      done: examDone, next: examNext,
      hash: '#/unit/' + unit.id + '/exam',
      aria: 'Unit exam — ' + unit.title +
        (examDone ? ', completed, best ' + examStars + ' of 3 stars' : examNext ? ', up next' : '')
    }));
    sec.appendChild(examOl);

    setView(sec, 'wide-path');
  }

  /* ------------------------------------------------------------------ *
   * Exercise generation
   * ------------------------------------------------------------------ */

  var exerciseKeyCounter = 0;

  /* exercise types that get one quiet retry after a miss */
  var RETRY_TYPES = {
    pick_picture: 1, reverse_pick: 1,
    hear_pick_letter: 1, letter_to_sound: 1,
    read_word_pick_picture: 1, picture_pick_word: 1
  };

  function makeEx(type, props) {
    var ex = { type: type, key: 'ex' + (++exerciseKeyCounter), retry: false };
    Object.keys(props).forEach(function (k) { ex[k] = props[k]; });
    return ex;
  }

  function padPairWords(base, tiers, target) {
    var words = base.slice(0, target);
    var seenId = {}, seenEn = {};
    words.forEach(function (w) { seenId[w.id] = true; seenEn[w.en] = true; });
    for (var t = 0; t < tiers.length && words.length < target; t++) {
      var cand = shuffle(tiers[t]);
      for (var i = 0; i < cand.length && words.length < target; i++) {
        var w = cand[i];
        if (seenId[w.id] || seenEn[w.en]) { continue; }
        seenId[w.id] = true;
        seenEn[w.en] = true;
        words.push(w);
      }
    }
    return words;
  }

  function buildLessonExercises(unit, lesson) {
    var items = wordsOf(lesson.items);
    var tiers = [items, unitWords(unit), ALL_WORDS];
    var exs = [];

    shuffle(items).forEach(function (w) {
      exs.push(makeEx('pick_picture', { word: w, tiers: tiers }));
    });

    var nReverse = Math.max(1, Math.min(items.length, 8 - items.length - 2));
    shuffle(items).slice(0, nReverse).forEach(function (w) {
      exs.push(makeEx('reverse_pick', { word: w, tiers: tiers }));
    });

    var pairWords = padPairWords(shuffle(items), tiers, 5);
    if (pairWords.length >= 3) {
      exs.push(makeEx('match_pairs', { words: pairWords }));
    }

    var buildable = items.filter(isBuildable);
    if (buildable.length) {
      exs.push(makeEx('build_word', { word: shuffle(buildable)[0] }));
    }

    // later units sprinkle in the reading exercises (read the Georgian word)
    if (C.units.indexOf(unit) >= 3) {
      var readPool = shuffle(items);
      exs.push(makeEx('read_word_pick_picture', { word: readPool[0], tiers: tiers }));
      exs.push(makeEx('picture_pick_word', { word: readPool[readPool.length - 1], tiers: tiers }));
    }

    // keep a picture exercise first (friendliest opener), mix the rest
    var first = exs[0];
    return [first].concat(shuffle(exs.slice(1)));
  }

  function buildPracticeExercises() {
    var pool = learnedWords().slice();
    pool.sort(function (a, b) {
      return (state.lastPracticed[a.id] || 0) - (state.lastPracticed[b.id] || 0);
    });
    var tiers = [pool, ALL_WORDS];
    var exs = [];
    var wi = 0;
    function nextWord() {
      var w = pool[wi % pool.length];
      wi++;
      return w;
    }
    var plan = ['pick_picture', 'reverse_pick', 'pick_picture', 'build_word', 'pick_picture',
                'reverse_pick', 'match_pairs', 'pick_picture', 'reverse_pick', 'pick_picture'];
    plan.forEach(function (type) {
      if (type === 'match_pairs') {
        var pairWords = padPairWords(shuffle(pool).slice(0, 5), [ALL_WORDS], 5);
        if (pairWords.length >= 3) { exs.push(makeEx('match_pairs', { words: pairWords })); }
        else { type = 'pick_picture'; }
      }
      if (type === 'build_word') {
        var buildable = pool.filter(isBuildable);
        if (buildable.length) {
          exs.push(makeEx('build_word', { word: shuffle(buildable)[0] }));
          return;
        }
        type = 'pick_picture';
      }
      if (type === 'pick_picture' || type === 'reverse_pick') {
        exs.push(makeEx(type, { word: nextWord(), tiers: tiers }));
      }
    });
    return exs;
  }

  /* ------------------------------------------------------------------ *
   * Session (lesson player) — shared by lessons and practice
   * ------------------------------------------------------------------ */

  function renderLessonRoute(lessonId) {
    var found = findLesson(lessonId);
    if (!found) { renderHome(); return; }
    startSession({
      mode: 'lesson',
      lessonId: lessonId,
      unit: found.unit,
      lesson: found.lesson,
      title: found.lesson.title,
      exercises: buildLessonExercises(found.unit, found.lesson)
    });
  }

  function startSession(cfg) {
    var sec = h('section', { 'class': 'view lesson-view', role: 'region', 'aria-label': cfg.title });
    var heading = h('h1', { 'class': 'visually-hidden', text: cfg.title });

    var fill = h('div', { 'class': 'progress-fill' });
    var bar = h('div', {
      'class': 'progress',
      role: 'progressbar',
      'aria-label': 'Lesson progress',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '0'
    }, [fill]);

    var exitBtn = h('button', {
      'class': 'exit-btn',
      type: 'button',
      'aria-label': 'Exit — your XP is saved',
      onclick: function () {
        toast('⭐ XP saved! See you soon 👋', { keep: true });
        navigate('#/home');
      }
    }, [h('span', { 'aria-hidden': 'true', text: '✕' })]);

    var counter = h('span', { 'class': 'progress-count', 'aria-hidden': 'true' });
    var area = h('div', { 'class': 'exercise-area' });

    sec.appendChild(heading);
    sec.appendChild(h('div', { 'class': 'lesson-topbar' }, [exitBtn, bar, counter]));
    sec.appendChild(area);
    setView(sec, '');

    var s = {
      cfg: cfg,
      queue: cfg.exercises.slice(),
      idx: 0,
      totalOriginal: cfg.exercises.length,
      score: 0,
      xpEarned: 0,
      maxPct: 0,
      area: area,
      fill: fill,
      bar: bar,
      counter: counter,
      missed: [],        // words to gently see again (finish-screen note)
      retriesQueued: 0,  // capped so sessions never balloon (L1)
      optionButtons: [],
      alive: true,
      timers: []
    };
    activeSession = s;
    showExercise(s);
  }

  function later(s, fn, ms) {
    var id = window.setTimeout(function () {
      if (s.alive && activeSession === s) { fn(); }
    }, ms);
    s.timers.push(id);
  }

  function updateProgress(s) {
    var pct = Math.round((s.idx / s.queue.length) * 100);
    if (pct > s.maxPct) { s.maxPct = pct; } // fill only ever moves forward
    s.fill.style.width = s.maxPct + '%';
    s.bar.setAttribute('aria-valuenow', String(s.maxPct));
    var step = Math.min(s.idx + 1, s.queue.length);
    s.counter.textContent = step + ' / ' + s.queue.length;
    s.bar.setAttribute('aria-valuetext', 'Step ' + step + ' of ' + s.queue.length);
  }

  /* what the current exercise is about, for the live-region announcement */
  function exPromptText(ex) {
    var it = ex.word || ex.letter || ex.item;
    if (!it) { return ''; }
    return it.translit || it.ka || '';
  }

  function showExercise(s) {
    if (!s.alive || activeSession !== s) { return; }
    updateProgress(s);
    if (s.idx >= s.queue.length) { finishSession(s); return; }
    var ex = s.queue[s.idx];
    s.area.innerHTML = '';
    s.area.classList.remove('warn-flash');
    s.optionButtons = [];
    RENDERERS[ex.type](ex, s.area, function (result) { handleResult(s, ex, result); }, s);
    /* keyboard focus glides question-to-question (H4): land on the
     * instruction, announce rule + prompt, Tab reaches option 1 next */
    var inst = s.area.querySelector('.instruction');
    if (inst) {
      inst.focus();
      var p = exPromptText(ex);
      announce((inst.getAttribute('data-inst') || inst.textContent) + (p ? ': ' + p : ''));
    }
  }

  function advance(s) {
    if (!s.alive || activeSession !== s) { return; }
    s.idx++;
    showExercise(s);
  }

  function handleResult(s, ex, result) {
    if (!s.alive || activeSession !== s) { return; }

    // remember practice recency for every word in this exercise
    var words = ex.words || (ex.word ? [ex.word] : []);
    var now = Date.now();
    words.forEach(function (w) { if (w && w.id) { state.lastPracticed[w.id] = now; } });

    var isPractice = s.cfg.mode === 'practice';

    if (result.correct) {
      s.score++; // a retried item scores here instead of at its original slot
      var xp = isPractice ? 5 : (result.firstTry && !ex.retry ? 10 : 5);
      s.xpEarned += xp;
      addXP(xp);
      save();
      chime();
      if (ex.type === 'build_word' && result.firstTry) {
        state.buildFirstTries++;
        save();
        if (state.buildFirstTries >= 10) { earnBadge('word-builder'); }
      }
      if (result.announce) { announce(result.announce); }
      later(s, function () { advance(s); }, 900);
    } else {
      save();
      boop();
      if (result.announce) { announce(result.announce); }
      // remember the word for the finish screen's gentle "see again" note
      if (ex.word && ex.word.id && s.missed.indexOf(ex.word) === -1) { s.missed.push(ex.word); }
      // gentle warm wash on the exercise area, 600ms
      s.area.classList.add('warn-flash');
      later(s, function () { s.area.classList.remove('warn-flash'); }, 600);
      // quietly re-queue the same item two exercises later for one retry —
      // capped per session so "about N questions" stays honest (L1)
      if (!ex.retry && RETRY_TYPES[ex.type] && s.retriesQueued < 3) {
        s.retriesQueued++;
        var props = {};
        Object.keys(ex).forEach(function (k) {
          if (k !== 'type' && k !== 'key' && k !== 'retry') { props[k] = ex[k]; }
        });
        var clone = makeEx(ex.type, props);
        clone.retry = true;
        var at = Math.min(s.idx + 3, s.queue.length);
        s.queue.splice(at, 0, clone);
      }
      /* after a miss the child is never frozen (H3): the Continue button
       * stays focused for keyboard/screen-reader users, the revealed green
       * card also continues on tap, and after the answer clip has had time
       * to play the exercise moves on by itself. All three funnel through
       * one guarded step so nothing double-advances. */
      var missIdx = s.idx;
      function goOn() {
        if (!s.alive || activeSession !== s || s.idx !== missIdx) { return; }
        advance(s);
      }
      var revealed = s.area.querySelector('.state-correct');
      if (revealed) {
        revealed.disabled = false;
        revealed.classList.add('reveal-continue');
        revealed.addEventListener('click', goOn);
      }
      var cont = h('button', {
        'class': 'btn btn-primary',
        type: 'button',
        onclick: goOn
      }, ['Continue']);
      s.area.appendChild(cont);
      s.optionButtons = [];
      cont.focus();
      /* self-advancing OR self-paced, never stuck — but never mid-sentence:
       * wait for the reveal to finish speaking, then a beat; if audio can't
       * play (blocked/missing) a generous fallback still moves things on.
       * goOn is guarded by missIdx, so the paths can't double-advance. */
      onRevealSpoken(function () { later(s, goOn, 1400); });
      later(s, goOn, 9000);
    }
  }

  /* ------------------------------------------------------------------ *
   * Finish screen
   * ------------------------------------------------------------------ */

  function confettiBurst(container) {
    if (prefersReducedMotion()) { return; }
    var colors = ['var(--accent)', 'var(--gold)', 'var(--success)'];
    var pieces = [];
    for (var i = 0; i < 12; i++) {
      var p = h('div', { 'class': 'confetti-piece', 'aria-hidden': 'true' });
      p.style.left = (5 + Math.random() * 90) + '%';
      p.style.background = colors[i % 3];
      p.style.animationDelay = (Math.random() * 0.25) + 's';
      container.appendChild(p);
      pieces.push(p);
    }
    window.setTimeout(function () {
      pieces.forEach(function (p) { if (p.parentNode) { p.parentNode.removeChild(p); } });
    }, 1800);
  }

  function finishSession(s) {
    s.alive = false;
    s.optionButtons = [];
    var mode = s.cfg.mode;
    var isPractice = mode === 'practice';
    var isReadingPractice = mode === 'reading-practice';
    var isExam = mode === 'letters-exam' || mode === 'reading-exam' || mode === 'unit-exam';
    var starsEarned = 0;
    var slotCount = 3;
    var acc, prev, bonus;

    if (isPractice) {
      state.practiceStars++;
      state.practiceSessions++;
      save();
      starsEarned = 1;
      slotCount = 1;
      if (state.practiceSessions >= 5) { earnBadge('practicer'); }
    } else if (isReadingPractice) {
      pushOnce(state.readingPracticeDone, s.cfg.stepId);
      save();
      slotCount = 0; // no stars for reading practice — praise + XP only
    } else if (isExam) {
      acc = s.totalOriginal ? s.score / s.totalOriginal : 1;
      starsEarned = acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : 1; // exams always award at least one star
      if (mode === 'letters-exam') {
        prev = state.lettersExamStars[s.cfg.groupId] || 0;
        state.lettersExamStars[s.cfg.groupId] = Math.max(prev, starsEarned);
      } else if (mode === 'reading-exam') {
        prev = state.readingExamStars[s.cfg.stepId] || 0;
        state.readingExamStars[s.cfg.stepId] = Math.max(prev, starsEarned);
      } else {
        prev = state.unitExamStars[s.cfg.unitId] || 0;
        state.unitExamStars[s.cfg.unitId] = Math.max(prev, starsEarned);
      }
      save();
      bonus = mode === 'unit-exam' ? 30 : 20;
      s.xpEarned += bonus;
      addXP(bonus);
      if (mode === 'reading-exam') { earnBadge('first-reader'); }
      if (mode === 'unit-exam') {
        if (prev === 0) { grantSticker(); } // first-time pass feeds the album
        maybeCrown(s.cfg.unit);
      }
    } else {
      acc = s.totalOriginal ? s.score / s.totalOriginal : 1;
      starsEarned = acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : 1; // finishing always earns at least one star
      prev = state.stars[s.cfg.lessonId] || 0;
      state.stars[s.cfg.lessonId] = Math.max(prev, starsEarned);
      save();
      bonus = 20;
      s.xpEarned += bonus;
      addXP(bonus);
      earnBadge('first-lesson');
      maybeCrown(s.cfg.unit);
    }
    updateChips();

    var finish = h('div', { 'class': 'finish' });
    finish.appendChild(borjgaliSvg('finish-borjgali'));
    finish.appendChild(h('p', { 'class': 'finish-title' }, [
      kaSpan(C.strings.excellent), ' · Excellent!'
    ]));

    if (slotCount > 0) {
      var slots = h('div', { 'class': 'star-slots', 'aria-label': isPractice
        ? 'Practice star earned'
        : starsEarned + ' of 3 stars earned' });
      for (var i = 0; i < slotCount; i++) {
        slots.appendChild(h('span', {
          'class': 'star-slot' + (i < starsEarned ? ' filled' : ''),
          'aria-hidden': 'true',
          text: '★'
        }));
      }
      finish.appendChild(slots);
    }
    if (isPractice) {
      finish.appendChild(h('p', { 'class': 'finish-note', text: 'Practice star!' }));
    }
    if (isReadingPractice) {
      finish.appendChild(h('p', { 'class': 'finish-note', text: 'Reading practice complete!' }));
    }
    finish.appendChild(h('p', { 'class': 'xp-line', text: '+' + s.xpEarned + ' XP' }));

    /* quiet, judgment-free replay list of missed words — a signal for
     * grown-ups, never a grade for the child */
    if (s.missed.length) {
      var seeAgain = h('div', { 'class': 'see-again' });
      seeAgain.appendChild(h('p', { 'class': 'finish-note', text: 'Words to see again:' }));
      var listRow = h('div', { 'class': 'see-again-row' });
      s.missed.slice(0, 4).forEach(function (w) {
        listRow.appendChild(h('span', { 'class': 'see-again-chip' }, [
          kaSpan(w.ka),
          audioBtn(w.id, w.ka, { small: true, label: 'Hear ' + (w.en || w.translit) + ' again' })
        ]));
      });
      seeAgain.appendChild(listRow);
      finish.appendChild(seeAgain);
    }

    var continueHash = '#/home';
    if (mode === 'letters-exam') { continueHash = '#/letters'; }
    if (mode === 'reading-exam' || isReadingPractice) { continueHash = '#/reading'; }
    if (mode === 'unit-exam') { continueHash = '#/unit/' + s.cfg.unitId; }

    /* friendly teaser toward the next step (non-exam finishes) */
    if (!isExam && !isReadingPractice) {
      var nxt = computeNextStep();
      if (nxt) {
        var teaser = h('p', { 'class': 'finish-note next-teaser' }, [
          'Next up: ' + nxt.nodeTitle + (nxt.lesson ? ' · ' + nxt.lesson.title : '') + ' — ' + nxt.unit.title
        ]);
        var teaseWord = nxt.lesson ? C.vocab[nxt.lesson.items[0]] : null;
        if (teaseWord) {
          teaser.appendChild(document.createTextNode('. You’ll meet ' + teaseWord.emoji + ' ' + teaseWord.en + ' '));
          teaser.appendChild(audioBtn(teaseWord.id, teaseWord.ka, { small: true, label: 'Hear ' + teaseWord.en }));
        }
        finish.appendChild(teaser);
      }
    }

    var redoLabel = 'Redo lesson';
    if (isPractice) { redoLabel = 'Practice again'; }
    if (isReadingPractice) { redoLabel = 'Practice again'; }
    if (isExam) { redoLabel = 'Redo exam'; }

    var actions = h('div', { 'class': 'finish-actions' });
    actions.appendChild(h('button', {
      'class': 'btn btn-primary btn-block', type: 'button',
      onclick: function () { navigate(continueHash); }
    }, ['Continue']));
    actions.appendChild(h('button', {
      'class': 'btn btn-secondary btn-block', type: 'button',
      onclick: function () {
        if (isPractice) { startPracticeSession(); }
        else if (mode === 'letters-exam') { startLettersExam(s.cfg.groupId); }
        else if (mode === 'reading-exam') { startReadingExam(s.cfg.stepId); }
        else if (mode === 'unit-exam') { startUnitExam(s.cfg.unitId); }
        else if (isReadingPractice) { startReadingPractice(s.cfg.stepId); }
        else { renderLessonRoute(s.cfg.lessonId); }
      }
    }, [redoLabel]));
    finish.appendChild(actions);

    s.area.innerHTML = '';
    s.area.appendChild(finish);
    s.fill.style.width = '100%';
    s.bar.setAttribute('aria-valuenow', '100');
    confettiBurst(finish);
    window.setTimeout(function () {
      // navigated away before the praise fired? stay quiet
      if (!document.body.contains(finish)) { return; }
      // "Well done!" in the child's known language first, then Georgian praise
      playUiClip('Well done!', function () {
        if (document.body.contains(finish)) { playPraise(); }
      }, 2400 /* the clip runs ~2.1s */);
    }, 600);
    var announceTail;
    if (isPractice) {
      announceTail = 'Practice complete. You earned a practice star and ' + s.xpEarned + ' XP.';
    } else if (isReadingPractice) {
      announceTail = 'Reading practice complete. You earned ' + s.xpEarned + ' XP.';
    } else if (isExam) {
      announceTail = 'Exam complete. You earned ' + starsEarned + (starsEarned === 1 ? ' star' : ' stars') + ' and ' + s.xpEarned + ' XP.';
    } else {
      announceTail = 'Lesson complete. You earned ' + starsEarned + (starsEarned === 1 ? ' star' : ' stars') + ' and ' + s.xpEarned + ' XP.';
    }
    announce('Excellent! ' + announceTail);
    var firstBtn = actions.querySelector('button');
    if (firstBtn) { firstBtn.focus(); }
  }

  /* ------------------------------------------------------------------ *
   * Exercise renderers — renderExercise(ex, container, onResult)
   * ------------------------------------------------------------------ */

  function markCorrectCard(card) {
    card.classList.add('state-correct', 'anim-pop');
    if (!card.querySelector('.check-badge')) {
      card.appendChild(h('span', { 'class': 'check-badge', 'aria-hidden': 'true', text: '✓' }));
    }
  }

  /* one-shot "the reveal has been fully spoken" hook: missTreatment fires it,
   * handleResult listens so the auto-advance waits for the clip, not a guess */
  var revealSpokenCb = null;
  var revealAlreadySpoken = false; // covers a chain that finishes synchronously (no audio at all)
  function onRevealSpoken(cb) {
    if (revealAlreadySpoken) { revealAlreadySpoken = false; cb(); return; }
    revealSpokenCb = cb;
  }
  function notifyRevealSpoken() {
    var cb = revealSpokenCb;
    revealSpokenCb = null;
    if (cb) { cb(); } else { revealAlreadySpoken = true; }
  }

  function missTreatment(tapped, correctCard, allButtons, word) {
    tapped.classList.add('anim-shake');
    window.setTimeout(function () {
      tapped.classList.remove('anim-shake');
      tapped.classList.add('state-dim');
    }, 350);
    allButtons.forEach(function (b) { b.disabled = true; });
    markCorrectCard(correctCard);
    /* miss rule in the child's known language first (pre-readers, v3),
     * then reveal AND speak the right answer */
    playUiClip('Almost! Here is the right one.', function () {
      playItem(word, notifyRevealSpoken);
    }, 4800 /* the clip runs ~4.4s — don't cut it short */);
  }

  function renderPickPicture(ex, container, onResult, s) {
    var word = ex.word;
    container.appendChild(instructionLine('Tap what you hear'));

    var prompt = h('div', { 'class': 'prompt-block' }, [
      h('span', { 'class': 'prompt-ka' }, [kaSpan(word.ka)]),
      audioBtn(word.id, word.ka, { label: 'Hear the word again' })
    ]);
    container.appendChild(prompt);
    container.appendChild(h('p', { 'class': 'translit', text: word.translit }));
    container.appendChild(sayHint(word.translit));

    var distractors = pickDistractors(word, 3, ex.tiers);
    var options = shuffle([word].concat(distractors));
    var grid = h('div', { 'class': 'options-grid' });
    var buttons = [];
    var answered = false;

    options.forEach(function (opt, i) {
      var btn = h('button', {
        'class': 'option-card',
        type: 'button',
        'aria-label': opt.en,
        onclick: function () {
          if (answered) { return; }
          answered = true;
          var correct = opt.id === word.id;
          if (correct) {
            buttons.forEach(function (b) { b.disabled = true; });
            markCorrectCard(btn);
            onResult({ correct: true, firstTry: true, announce: 'Correct! ' + word.ka + ' — ' + word.en });
          } else {
            var correctBtn = buttons[options.indexOf(word)];
            missTreatment(btn, correctBtn, buttons, word);
            onResult({ correct: false, firstTry: false, announce: 'Almost! The answer is ' + word.ka + ' — ' + word.en });
          }
        }
      }, [
        h('span', { 'class': 'option-emoji', 'aria-hidden': 'true', text: opt.emoji }),
        h('span', { 'class': 'option-caption', text: opt.en })
      ]);
      buttons.push(btn);
      grid.appendChild(btn);
    });
    container.appendChild(grid);
    var hint = kbdHint();
    if (hint) { container.appendChild(hint); }
    if (s) { s.optionButtons = buttons; }
    speakThen(container, 'Tap what you hear', function () { playWord(word); });
  }

  /* reverse_pick — the FIRST tap on a word card judges (H2), exactly like
   * every other exercise. The per-row 🔊 buttons stay the free "explore
   * out loud" affordance. */
  function renderReversePick(ex, container, onResult, s) {
    var word = ex.word;
    container.appendChild(instructionLine('Tap the Georgian word for:'));
    container.appendChild(h('div', { 'class': 'prompt-block' }, [
      emojiSpan(word.emoji, word.en, 'prompt-emoji'),
      h('span', { 'class': 'prompt-en', text: word.en })
    ]));

    var distractors = pickDistractors(word, 3, ex.tiers);
    var options = shuffle([word].concat(distractors));
    var list = h('div', { 'class': 'options-list' });
    var buttons = [];
    var answered = false;

    options.forEach(function (opt) {
      var btn = h('button', {
        'class': 'word-card',
        type: 'button',
        onclick: function () {
          if (answered) { return; }
          answered = true;
          if (opt.id === word.id) {
            buttons.forEach(function (b) { b.disabled = true; });
            markCorrectCard(btn);
            playWord(word);
            onResult({ correct: true, firstTry: true, announce: 'Correct! ' + word.ka + ' — ' + word.en });
          } else {
            var correctBtn = buttons[options.indexOf(word)];
            missTreatment(btn, correctBtn, buttons, word);
            onResult({ correct: false, firstTry: false, announce: 'Almost! The answer is ' + word.ka + ' — ' + word.en });
          }
        }
      }, [
        h('span', { 'class': 'word-ka' }, [kaSpan(opt.ka)]),
        h('span', { 'class': 'word-translit', text: opt.translit })
      ]);
      buttons.push(btn);
      list.appendChild(h('div', { 'class': 'option-row' }, [
        btn,
        audioBtn(opt.id, opt.ka, { small: true, label: 'Hear this word' })
      ]));
    });
    container.appendChild(list);
    var hint = kbdHint();
    if (hint) { container.appendChild(hint); }
    if (s) { s.optionButtons = buttons; }
    playUiClip('Tap the Georgian word for:');
  }

  function renderMatchPairs(ex, container, onResult, s) {
    var words = ex.words;
    container.appendChild(instructionLine('Match the pairs'));

    var leftWords = shuffle(words);
    var rightWords = shuffle(words);
    var lockedCount = 0;
    var mistakes = 0;
    var selLeft = null;
    var selRight = null;
    var finished = false;

    function makeSide(list, isKa) {
      var col = h('div', { 'class': 'pairs-col' });
      list.forEach(function (w) {
        var btn = h('button', {
          'class': 'pair-btn',
          type: 'button',
          'aria-pressed': 'false',
          'aria-label': isKa ? w.ka + ' (' + w.translit + ')' : w.en
        }, [isKa ? kaSpan(w.ka) : h('span', { text: w.en })]);
        btn._word = w;
        btn._isKa = isKa;
        btn.addEventListener('click', function () { onTap(btn); });
        col.appendChild(btn);
      });
      return col;
    }

    function select(btn) {
      if (btn._isKa) {
        if (selLeft) { deselect(selLeft); }
        selLeft = btn;
        playWord(btn._word);
      } else {
        if (selRight) { deselect(selRight); }
        selRight = btn;
      }
      btn.classList.add('state-selected');
      btn.setAttribute('aria-pressed', 'true');
    }

    function deselect(btn) {
      btn.classList.remove('state-selected');
      btn.setAttribute('aria-pressed', 'false');
      if (selLeft === btn) { selLeft = null; }
      if (selRight === btn) { selRight = null; }
    }

    function lock(btn) {
      deselect(btn);
      btn.classList.add('state-locked');
      btn.disabled = true;
      btn.appendChild(h('span', { 'class': 'check-badge', 'aria-hidden': 'true', text: '✓' }));
    }

    /* keyboard focus never falls off a freshly-disabled button (L4):
     * glide to the next enabled button in the same column, else anywhere */
    function refocusAfterLock(fromBtn) {
      var col = fromBtn.parentNode;
      var inCol = Array.prototype.slice.call(col.querySelectorAll('.pair-btn'));
      var idx = inCol.indexOf(fromBtn);
      for (var i = 1; i <= inCol.length; i++) {
        var cand = inCol[(idx + i) % inCol.length];
        if (!cand.disabled) { cand.focus(); return; }
      }
      var any = container.querySelector('.pair-btn:not([disabled])');
      if (any) { any.focus(); }
    }

    function onTap(btn) {
      if (finished || btn.disabled) { return; }
      if ((btn._isKa && selLeft === btn) || (!btn._isKa && selRight === btn)) {
        deselect(btn);
        return;
      }
      select(btn);
      if (selLeft && selRight) {
        var l = selLeft, r = selRight;
        if (l._word.id === r._word.id) {
          lock(l);
          lock(r);
          lockedCount++;
          if (lockedCount < words.length && (document.activeElement === l || document.activeElement === r ||
              document.activeElement === document.body || document.activeElement === btn)) {
            refocusAfterLock(btn);
          }
          playNotes([{ f: 880, t: 0, d: 0.12 }]);
          announce('Matched: ' + l._word.ka + ' — ' + l._word.en);
          if (lockedCount === words.length) {
            finished = true;
            onResult({
              correct: true,
              firstTry: mistakes === 0,
              announce: 'All pairs matched!'
            });
          }
        } else {
          mistakes++;
          l.classList.add('anim-shake');
          r.classList.add('anim-shake');
          window.setTimeout(function () {
            l.classList.remove('anim-shake');
            r.classList.remove('anim-shake');
            deselect(l);
            deselect(r);
          }, 360);
          announce('Not a pair — try again!');
        }
      }
    }

    var grid = h('div', { 'class': 'pairs-grid' }, [
      makeSide(leftWords, true),
      makeSide(rightWords, false)
    ]);
    container.appendChild(grid);
    if (s) { s.optionButtons = []; }
    playUiClip('Match the pairs');
  }

  /* renders build_word AND build_syllable — accepts any {id, ka, translit,
   * en?, emoji?}; syllables (no emoji) get "Build what you hear" + auto audio */
  function renderBuildWord(ex, container, onResult, s) {
    var word = ex.word;
    var letters = String(word.ka).split('');
    var hasMeaning = !!word.emoji;
    var instText = hasMeaning ? 'Build the word' : 'Build what you hear';
    container.appendChild(instructionLine(instText));
    var promptBits = [];
    if (hasMeaning) {
      promptBits.push(emojiSpan(word.emoji, word.en, 'prompt-emoji'));
      promptBits.push(h('span', { 'class': 'prompt-en', text: word.en }));
    }
    promptBits.push(audioBtn(word.id, word.ka, { label: 'Hear it' }));
    container.appendChild(h('div', { 'class': 'prompt-block' }, promptBits));
    container.appendChild(h('p', { 'class': 'translit', text: word.translit }));

    // 2 distractor letters not present in the word
    var inWord = {};
    letters.forEach(function (ch) { inWord[ch] = true; });
    var extras = shuffle(ALL_LETTERS.filter(function (l) { return !inWord[l.ka]; })).slice(0, 2)
      .map(function (l) { return l.ka; });

    var slotEls = [];
    var slotsRow = h('div', { 'class': 'build-slots', 'aria-label': 'Word slots' });
    letters.forEach(function () {
      var slot = h('div', { 'class': 'build-slot' });
      slotEls.push(slot);
      slotsRow.appendChild(slot);
    });
    container.appendChild(slotsRow);

    var nextIdx = 0;
    var misplacements = 0;
    var usedHint = false;
    var done = false;
    var tiles = [];

    function placeTile(tileBtn) {
      var slot = slotEls[nextIdx];
      slot.textContent = tileBtn._letter;
      slot.classList.add('filled', 'ka');
      slot.setAttribute('lang', 'ka');
      tileBtn.disabled = true;
      /* keyboard focus glides to the next enabled tile (L4) */
      if (document.activeElement === tileBtn || document.activeElement === document.body) {
        var ti = tiles.indexOf(tileBtn);
        for (var k = 1; k <= tiles.length; k++) {
          var cand = tiles[(ti + k) % tiles.length];
          if (!cand.disabled) { cand.focus(); break; }
        }
      }
      nextIdx++;
      if (nextIdx === letters.length) {
        done = true;
        slotsRow.classList.add('anim-pop');
        onResult({
          correct: true,
          firstTry: misplacements === 0 && !usedHint,
          announce: 'You built it! ' + word.ka + (word.en ? ' — ' + word.en : '')
        });
      }
    }

    function showHintButton() {
      if (container.querySelector('.hint-btn')) { return; }
      var hint = h('button', {
        'class': 'btn btn-ghost hint-btn',
        type: 'button',
        onclick: function () {
          if (done) { return; }
          usedHint = true;
          var need = letters[nextIdx];
          for (var i = 0; i < tiles.length; i++) {
            if (!tiles[i].disabled && tiles[i]._letter === need) {
              placeTile(tiles[i]);
              return;
            }
          }
        }
      }, ['Show me']);
      container.appendChild(hint);
    }

    var tilesRow = h('div', { 'class': 'build-tiles' });
    shuffle(letters.concat(extras)).forEach(function (ch) {
      var tile = h('button', {
        'class': 'letter-tile-btn',
        type: 'button',
        'aria-label': 'Letter ' + ch
      }, [kaSpan(ch)]);
      tile._letter = ch;
      tile.addEventListener('click', function () {
        if (done || tile.disabled) { return; }
        if (ch === letters[nextIdx]) {
          placeTile(tile);
        } else {
          misplacements++;
          var slot = slotEls[nextIdx];
          slot.classList.add('anim-shake', 'slot-warn');
          window.setTimeout(function () {
            slot.classList.remove('anim-shake', 'slot-warn');
          }, 400);
          announce('Not that one — try another letter!');
          if (misplacements >= 2) { showHintButton(); }
        }
      });
      tiles.push(tile);
      tilesRow.appendChild(tile);
    });
    container.appendChild(tilesRow);
    if (s) { s.optionButtons = []; }
    if (!hasMeaning) {
      // "Build what you hear" — rule first, then say the syllable
      speakThen(container, instText, function () { playWord(word); });
    } else {
      playUiClip(instText);
    }
  }

  var RENDERERS = {
    pick_picture: renderPickPicture,
    reverse_pick: renderReversePick,
    match_pairs: renderMatchPairs,
    build_word: renderBuildWord,
    build_syllable: renderBuildWord,
    hear_pick_letter: renderHearPickLetter,
    letter_to_sound: renderLetterToSound,
    trace_letter: renderTraceLetter,
    read_word_pick_picture: renderReadWordPickPicture,
    picture_pick_word: renderPicturePickWord
  };

  /* number keys 1–4 pick answers in option grids */
  document.addEventListener('keydown', function (e) {
    if (!activeSession || !activeSession.alive) { return; }
    if (!activeSession.optionButtons || !activeSession.optionButtons.length) { return; }
    if (e.key >= '1' && e.key <= '4') {
      var idx = Number(e.key) - 1;
      var btn = activeSession.optionButtons[idx];
      if (btn && !btn.disabled) { btn.click(); }
    }
  });

  /* ------------------------------------------------------------------ *
   * Alphabet
   * ------------------------------------------------------------------ */

  function renderAlphabet() {
    var sec = h('section', { 'class': 'view alphabet-view', role: 'region', 'aria-label': 'Alphabet' });
    sec.appendChild(h('h1', {}, [kaSpan(C.strings.alphabet), ' · The alphabet']));
    sec.appendChild(h('p', { 'class': 'alpha-intro' }, [
      kaSpan(C.strings.georgianAlphabet), ' — ' + ALL_LETTERS.length + ' letters, and every one says exactly one sound.'
    ]));

    var learned = learnedLetterSet();
    var flat = ALL_LETTERS;

    C.alphabet.forEach(function (group) {
      sec.appendChild(h('h2', { 'class': 'alpha-group-title', text: group.title }));
      var grid = h('div', { 'class': 'alpha-grid' });
      group.letters.forEach(function (letter) {
        var flatIdx = flat.indexOf(letter);
        var tile = h('button', {
          'class': 'letter-tile-card' + (learned[letter.ka] ? ' learned' : ''),
          type: 'button',
          'aria-label': 'Letter ' + letter.name + ', ' + letter.translit + (learned[letter.ka] ? ', learned' : ''),
          onclick: function () { openLetterDialog(flatIdx, tile); }
        }, [
          h('span', { 'class': 'tile-ka' }, [kaSpan(letter.ka)]),
          h('span', { 'class': 'tile-translit', text: letter.translit })
        ]);
        grid.appendChild(h('div', { 'class': 'tile-wrap' }, [
          tile,
          audioBtn(letterAudioId(letter), letter.ka, { small: true, label: 'Hear letter ' + letter.name })
        ]));
      });
      sec.appendChild(grid);
    });

    setView(sec, 'wide-alphabet');
  }

  function vocabEmojiFor(exampleKa) {
    for (var i = 0; i < ALL_WORDS.length; i++) {
      if (ALL_WORDS[i].ka === exampleKa) { return ALL_WORDS[i]; }
    }
    return null;
  }

  /* bundled clip for a letter's example word: reuse the matching vocab
   * item's clip, else the dedicated example clip (audioIds.examples). */
  function exampleAudioId(exampleKa, vocabMatch) {
    if (vocabMatch && vocabMatch.id) { return vocabMatch.id; }
    return (C.audioIds && C.audioIds.examples && C.audioIds.examples[exampleKa]) || null;
  }

  function openLetterDialog(index, returnFocusEl) {
    var backdrop = h('div', { 'class': 'modal-backdrop' });
    var dialog = h('div', { 'class': 'letter-dialog', role: 'dialog', 'aria-modal': 'true' });
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    var current = index;

    /* focusLetter — true after prev/next so keyboard focus glides to the
     * new letter instead of being yanked to the Close button (M9) */
    function fill(focusLetter) {
      var letter = ALL_LETTERS[current];
      recordLetterOpened(letter);
      dialog.setAttribute('aria-label', 'Letter ' + letter.name);
      dialog.innerHTML = '';

      dialog.appendChild(h('button', {
        'class': 'dialog-close',
        type: 'button',
        'aria-label': 'Close',
        onclick: close
      }, [h('span', { 'aria-hidden': 'true', text: '✕' })]));

      dialog.appendChild(h('div', { 'class': 'dialog-letter', tabindex: '-1' }, [kaSpan(letter.ka)]));
      dialog.appendChild(h('div', { 'class': 'dialog-name', text: letter.name + ' · ' + letter.translit }));
      dialog.appendChild(h('div', { 'class': 'dialog-ipa', text: 'sound: /' + letter.ipa + '/' }));

      var ex = letter.example;
      var vocabMatch = vocabEmojiFor(ex.ka);
      var exampleBits = [h('div', { 'class': 'example-ka' }, [kaSpan(ex.ka)])];
      if (vocabMatch) {
        exampleBits.unshift(emojiSpan(vocabMatch.emoji, ex.en, 'prompt-emoji'));
      }
      exampleBits.push(audioBtn(exampleAudioId(ex.ka, vocabMatch), ex.ka, { small: true, label: 'Hear the example word' }));
      dialog.appendChild(h('div', { 'class': 'example-row' }, exampleBits));
      dialog.appendChild(h('div', { 'class': 'example-en', text: ex.translit + ' — ' + ex.en }));
      dialog.appendChild(sayHint(letter.translit));

      dialog.appendChild(h('button', {
        'class': 'btn btn-primary',
        type: 'button',
        onclick: function () {
          playLetter(letter);
          window.setTimeout(function () {
            // dialog closed (or moved on) before the example fired? stay quiet
            if (!document.body.contains(dialog)) { return; }
            playAudio(exampleAudioId(ex.ka, vocabMatch), ex.ka);
          }, 900);
        }
      }, ['🔊 Hear it']));

      var nav = h('div', { 'class': 'dialog-nav' });
      nav.appendChild(h('button', {
        'class': 'dialog-arrow',
        type: 'button',
        'aria-label': 'Previous letter',
        disabled: current === 0 ? true : null,
        onclick: function () { if (current > 0) { current--; fill(true); } }
      }, [h('span', { 'aria-hidden': 'true', text: '←' })]));
      nav.appendChild(h('span', { 'class': 'dialog-ipa', text: (current + 1) + ' / ' + ALL_LETTERS.length }));
      nav.appendChild(h('button', {
        'class': 'dialog-arrow',
        type: 'button',
        'aria-label': 'Next letter',
        disabled: current === ALL_LETTERS.length - 1 ? true : null,
        onclick: function () { if (current < ALL_LETTERS.length - 1) { current++; fill(true); } }
      }, [h('span', { 'aria-hidden': 'true', text: '→' })]));
      dialog.appendChild(nav);
      dialog.appendChild(h('p', { 'class': 'dialog-ipa dialog-keys-hint', text: '← → keys work here' }));

      if (focusLetter) {
        var glyph = dialog.querySelector('.dialog-letter');
        if (glyph) { glyph.focus(); }
        announce('Letter ' + letter.name + ', ' + letter.translit);
      } else {
        var closeBtn = dialog.querySelector('.dialog-close');
        if (closeBtn) { closeBtn.focus(); }
      }
    }

    function close() {
      document.removeEventListener('keydown', onKey, true);
      if (backdrop.parentNode) { backdrop.parentNode.removeChild(backdrop); }
      if (returnFocusEl) { returnFocusEl.focus(); }
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowLeft' && current > 0) { e.preventDefault(); current--; fill(true); return; }
      if (e.key === 'ArrowRight' && current < ALL_LETTERS.length - 1) { e.preventDefault(); current++; fill(true); return; }
      if (e.key === 'Tab') {
        // simple focus trap
        var focusables = dialog.querySelectorAll('button:not([disabled])');
        if (!focusables.length) { return; }
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) { close(); }
    });
    document.addEventListener('keydown', onKey, true);
    fill();
  }

  /* ------------------------------------------------------------------ *
   * Practice / review
   * ------------------------------------------------------------------ */

  function renderPractice() {
    var sec = h('section', { 'class': 'view practice-view', role: 'region', 'aria-label': 'Review' });
    sec.appendChild(h('h1', {}, [kaSpan(C.strings.practice), ' · Review']));

    var learned = learnedWords();
    var card = h('div', { 'class': 'practice-card' }, [
      emojiSpan('🧠', 'practice', 'entry-emoji'),
      h('h2', { text: 'Practice everything you’ve learned' }),
      h('p', { 'class': 'practice-count', text: learned.length + ' words ready to practice' }),
      h('button', {
        'class': 'btn btn-primary btn-block',
        type: 'button',
        onclick: startPracticeSession
      }, ['Start practice'])
    ]);
    sec.appendChild(card);
    setView(sec, '');
  }

  function startPracticeSession() {
    startSession({
      mode: 'practice',
      title: 'Practice',
      exercises: buildPracticeExercises()
    });
  }

  /* ================================================================== *
   * v2 — Letters path, Reading track, new exercise types
   * ================================================================== */

  /* ---------- shared lookups ---------- */

  var SYLLABLES = {};
  var READ_EXTRAS = {};
  (C.readingTrack ? C.readingTrack.syllables : []).forEach(function (x) { SYLLABLES[x.id] = x; });
  (C.readingTrack ? C.readingTrack.extras : []).forEach(function (x) { READ_EXTRAS[x.id] = x; });
  var READ_POOL = (C.readingTrack ? C.readingTrack.extras : []).concat(ALL_WORDS);
  var LETTER_BY_KA = {};
  ALL_LETTERS.forEach(function (l) { LETTER_BY_KA[l.ka] = l; });

  function readItem(id) {
    return C.vocab[id] || READ_EXTRAS[id] || SYLLABLES[id] || null;
  }

  function itemAudioId(item) {
    if (!item) { return null; }
    return item.id || (item.name ? letterAudioId(item) : null);
  }

  function alphaGroupById(groupId) {
    for (var i = 0; i < C.alphabet.length; i++) {
      if (C.alphabet[i].id === groupId) { return C.alphabet[i]; }
    }
    return null;
  }

  function findPathGroup(groupId) {
    var groups = (C.lettersPath && C.lettersPath.groups) || [];
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].groupId === groupId) { return groups[i]; }
    }
    return null;
  }

  function findReadingStep(stepId) {
    var steps = (C.readingTrack && C.readingTrack.steps) || [];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].id === stepId) { return steps[i]; }
    }
    return null;
  }

  function recordLetterOpened(letter) {
    if (pushOnce(state.letterCardsOpened, letter.ka)) {
      save();
      if (state.letterCardsOpened.length >= 10) { earnBadge('alphabet-explorer'); }
    }
  }

  function recordTraced(ka) {
    if (pushOnce(state.lettersTraced, ka)) {
      save();
      if (state.lettersTraced.length >= 10) { earnBadge('letter-artist'); }
    }
  }

  function backLink(text, hash) {
    return h('button', {
      'class': 'back-link', type: 'button',
      onclick: function () { navigate(hash); }
    }, [h('span', { 'aria-hidden': 'true', text: '←' }), ' ' + text]);
  }

  /* pick n distinct-by-ka items for a letter/syllable, trying tiers in order */
  function pickByKa(target, n, tiers) {
    var out = [];
    var seen = {};
    seen[target.ka] = true;
    for (var t = 0; t < tiers.length && out.length < n; t++) {
      var cand = shuffle(tiers[t] || []);
      for (var i = 0; i < cand.length && out.length < n; i++) {
        if (seen[cand[i].ka]) { continue; }
        seen[cand[i].ka] = true;
        out.push(cand[i]);
      }
    }
    return out;
  }

  /* ---------- tracing canvas (shared by trace view + trace_letter) ---------- */

  function makeTraceCanvas(letter) {
    var strokeCount = 0;
    var size = Math.max(220, Math.min(300, Math.floor(window.innerWidth * 0.8)));
    var dpr = window.devicePixelRatio || 1;
    var canvas = h('canvas', {
      'class': 'trace-canvas',
      tabindex: '0',
      'aria-label': 'Tracing area for letter ' + letter.ka +
        ' — draw over the gray letter with your finger or mouse, or use the Watch it draw button'
    });
    var ctx = canvas.getContext('2d');

    function applySize() {
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    applySize();

    function template() {
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.fillStyle = 'rgba(43, 35, 32, 0.14)'; // ink at 14% — the faint model glyph
      ctx.font = Math.round(size * 0.8) + 'px "Noto Sans Georgian", "Sylfaen", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter.ka, size / 2, size / 2 + size * 0.04);
      ctx.restore();
    }
    template();

    /* rotate / resize: recompute the canvas and redraw the model glyph.
     * Stroke COUNT is preserved (progress never lost), the ink redraws. */
    var resizeTimer = null;
    function onResize() {
      if (!document.body.contains(canvas)) {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('orientationchange', onResize);
        return;
      }
      if (resizeTimer) { window.clearTimeout(resizeTimer); }
      resizeTimer = window.setTimeout(function () {
        var next = Math.max(220, Math.min(300, Math.floor(window.innerWidth * 0.8)));
        if (next === size) { return; }
        size = next;
        applySize();
        template();
      }, 250);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    /* "Watch it draw" (H7) — the glyph fades in stroke-red, then counts as
     * traced, so keyboard users complete tracing too. Reduced motion →
     * instant reveal. */
    var watching = false;
    function watchDraw(doneFn) {
      if (watching) { return; }
      watching = true;
      var reduced = prefersReducedMotion();
      var t0 = null;
      var dur = 1200;
      function paint(alpha) {
        template();
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#DA291C'; // --accent (canvas needs a literal)
        ctx.font = Math.round(size * 0.8) + 'px "Noto Sans Georgian", "Sylfaen", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter.ka, size / 2, size / 2 + size * 0.04);
        ctx.restore();
      }
      function finishWatch() {
        watching = false;
        strokeCount = Math.max(1, strokeCount); // watching counts as traced
        if (doneFn) { doneFn(); }
      }
      if (reduced) { paint(1); finishWatch(); return; }
      function frame(ts) {
        if (!document.body.contains(canvas)) { watching = false; return; }
        if (t0 === null) { t0 = ts; }
        var k = Math.min(1, (ts - t0) / dur);
        paint(k);
        if (k < 1) { window.requestAnimationFrame(frame); }
        else { finishWatch(); }
      }
      window.requestAnimationFrame(frame);
    }

    var drawing = false;
    var lx = 0, ly = 0;
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      drawing = true;
      strokeCount++;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      var p = pos(e);
      lx = p[0]; ly = p[1];
      ctx.strokeStyle = '#DA291C'; // --accent (canvas needs a literal)
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 0.01, ly + 0.01);
      ctx.stroke();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) { return; }
      var p = pos(e);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
      lx = p[0]; ly = p[1];
    });
    function stop() { drawing = false; }
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    return {
      el: canvas,
      getStrokeCount: function () { return strokeCount; },
      watch: watchDraw,
      clear: function () { strokeCount = 0; template(); }
    };
  }

  /* the shared "▶ Watch it draw" control for every trace surface (H7) */
  function watchDrawBtn(tc, letter) {
    return h('button', {
      'class': 'btn btn-secondary', type: 'button',
      'aria-label': 'Watch the letter ' + letter.ka + ' draw itself',
      onclick: function () {
        tc.watch(function () {
          recordTraced(letter.ka);
          announce('The letter drew itself — now it counts as traced!');
        });
      }
    }, ['▶ Watch it draw']);
  }

  /* ---------- new exercise renderers ---------- */

  function renderHearPickLetter(ex, container, onResult, s) {
    var letter = ex.letter;
    container.appendChild(instructionLine('Tap the letter you hear'));
    container.appendChild(h('div', { 'class': 'prompt-block' }, [
      audioBtn(letterAudioId(letter), letter.ka, { lg: true, label: 'Play the letter sound again' })
    ]));

    var options = shuffle([letter].concat(pickByKa(letter, 3, [ex.pool || [], ALL_LETTERS])));
    var grid = h('div', { 'class': 'letter-choice-grid' });
    var buttons = [];
    var answered = false;

    options.forEach(function (opt) {
      var btn = h('button', {
        'class': 'letter-choice',
        type: 'button',
        'aria-label': 'Letter ' + opt.name + ', ' + opt.translit,
        onclick: function () {
          if (answered) { return; }
          answered = true;
          if (opt.ka === letter.ka) {
            buttons.forEach(function (b) { b.disabled = true; });
            markCorrectCard(btn);
            onResult({ correct: true, firstTry: true, announce: 'Correct! ' + letter.ka + ' — ' + letter.name });
          } else {
            var correctBtn = buttons[options.indexOf(letter)];
            missTreatment(btn, correctBtn, buttons, letter);
            onResult({ correct: false, firstTry: false, announce: 'Almost! The answer is ' + letter.ka + ' — ' + letter.name });
          }
        }
      }, [kaSpan(opt.ka)]);
      buttons.push(btn);
      grid.appendChild(btn);
    });
    container.appendChild(grid);
    var hint = kbdHint();
    if (hint) { container.appendChild(hint); }
    if (s) { s.optionButtons = buttons; }
    speakThen(container, 'Tap the letter you hear', function () { playLetter(letter); });
  }

  function renderLetterToSound(ex, container, onResult, s) {
    var item = ex.item; // a letter OR a syllable ({ka, translit, name?})
    var isLetter = !!item.name;
    container.appendChild(instructionLine('What sound does it make?'));
    container.appendChild(h('div', { 'class': 'prompt-block' }, [
      h('span', { 'class': 'prompt-ka prompt-ka-xl' }, [kaSpan(item.ka)]),
      audioBtn(itemAudioId(item), item.ka, { label: 'Hear it' })
    ]));

    var padTier = isLetter ? ALL_LETTERS : (C.readingTrack ? C.readingTrack.syllables : []);
    var options = shuffle([item].concat(pickByKa(item, 3, [ex.pool || [], padTier])));
    var list = h('div', { 'class': 'options-list' });
    var cards = [];
    var answered = false;

    options.forEach(function (opt) {
      var card = h('button', {
        'class': 'word-card sound-card',
        type: 'button',
        'aria-label': opt.translit,
        onclick: function () {
          if (answered) { return; }
          answered = true;
          if (opt.ka === item.ka) {
            cards.forEach(function (b) { b.disabled = true; });
            markCorrectCard(card);
            onResult({ correct: true, firstTry: true, announce: 'Correct! ' + item.ka + ' — ' + item.translit });
          } else {
            var correctCard = cards[options.indexOf(item)];
            missTreatment(card, correctCard, cards, item);
            onResult({ correct: false, firstTry: false, announce: 'Almost! ' + item.ka + ' says ' + item.translit });
          }
        }
      }, [h('span', { 'class': 'sound-translit', text: opt.translit })]);
      cards.push(card);
      list.appendChild(h('div', { 'class': 'option-row' }, [
        card,
        audioBtn(itemAudioId(opt), opt.ka, { small: true, label: 'Hear this option' })
      ]));
    });
    container.appendChild(list);
    var hint = kbdHint();
    if (hint) { container.appendChild(hint); }
    if (s) { s.optionButtons = cards; }
    playUiClip('What sound does it make?');
  }

  function renderTraceLetter(ex, container, onResult, s) {
    var letter = ex.letter;
    container.appendChild(instructionLine('Trace the letter'));
    var tc = makeTraceCanvas(letter);
    container.appendChild(h('div', { 'class': 'trace-card' }, [tc.el]));
    var done = false;
    container.appendChild(h('div', { 'class': 'trace-controls' }, [
      audioBtn(letterAudioId(letter), letter.ka, { label: 'Hear the letter' }),
      watchDrawBtn(tc, letter),
      h('button', {
        'class': 'btn btn-ghost', type: 'button',
        onclick: function () { tc.clear(); }
      }, ['Clear']),
      h('button', {
        'class': 'btn btn-primary', type: 'button',
        onclick: function () {
          if (done) { return; }
          done = true;
          if (tc.getStrokeCount() > 0) { recordTraced(letter.ka); }
          // tracing is doing — always correct, never judged
          onResult({ correct: true, firstTry: true, announce: 'You wrote ' + letter.ka + '!' });
        }
      }, ['Done ✓'])
    ]));
    if (s) { s.optionButtons = []; }
    speakThen(container, 'Trace the letter', function () { playLetter(letter); });
  }

  function renderReadWordPickPicture(ex, container, onResult, s) {
    var word = ex.word;
    container.appendChild(instructionLine('Read it — then tap its picture'));

    /* the sound starts "locked" but the button still TALKS (M1): tapping it
     * wiggles and explains, then it becomes a live 🔊 after the answer */
    var answered = false;
    var listenIcon = h('span', { 'aria-hidden': 'true', text: '🔒' });
    var listen = h('button', {
      'class': 'speak-btn speak-btn--waiting',
      type: 'button',
      'aria-label': 'Read it first — then the sound unlocks!',
      onclick: function (e) {
        e.stopPropagation();
        if (!answered) {
          listen.classList.add('anim-shake');
          window.setTimeout(function () { listen.classList.remove('anim-shake'); }, 400);
          playUiClip('Read it first — then the sound unlocks!');
          announce('Read it first — then the sound unlocks!');
          return;
        }
        playWord(word);
      }
    }, [listenIcon]);
    container.appendChild(h('div', { 'class': 'prompt-block' }, [
      h('span', { 'class': 'prompt-ka' }, [kaSpan(word.ka)]),
      listen
    ]));
    var translitLine = h('p', { 'class': 'translit', text: word.translit });

    var distractors = pickDistractors(word, 3, ex.tiers);
    var options = shuffle([word].concat(distractors));
    var grid = h('div', { 'class': 'options-grid' });
    var buttons = [];

    function unlock() {
      listen.classList.remove('speak-btn--waiting');
      listenIcon.textContent = '🔊';
      listen.setAttribute('aria-label', 'Hear the word');
      container.insertBefore(translitLine, grid);
    }

    options.forEach(function (opt) {
      var btn = h('button', {
        'class': 'option-card',
        type: 'button',
        'aria-label': opt.en,
        onclick: function () {
          if (answered) { return; }
          answered = true;
          unlock();
          if (opt.id === word.id) {
            buttons.forEach(function (b) { b.disabled = true; });
            markCorrectCard(btn);
            playWord(word);
            onResult({ correct: true, firstTry: true, announce: 'Correct! ' + word.ka + ' — ' + word.en });
          } else {
            var correctBtn = buttons[options.indexOf(word)];
            missTreatment(btn, correctBtn, buttons, word);
            onResult({ correct: false, firstTry: false, announce: 'Almost! The answer is ' + word.ka + ' — ' + word.en });
          }
        }
      }, [
        h('span', { 'class': 'option-emoji', 'aria-hidden': 'true', text: opt.emoji }),
        h('span', { 'class': 'option-caption', text: opt.en })
      ]);
      buttons.push(btn);
      grid.appendChild(btn);
    });
    container.appendChild(grid);
    var hint = kbdHint();
    if (hint) { container.appendChild(hint); }
    if (s) { s.optionButtons = buttons; }
    // no word audio, no translit up front — this one is the reading test
    playUiClip('Read it — then tap its picture');
  }

  function renderPicturePickWord(ex, container, onResult, s) {
    var word = ex.word;
    container.appendChild(instructionLine('Which word says it?'));
    container.appendChild(h('div', { 'class': 'prompt-block' }, [
      emojiSpan(word.emoji, word.en, 'prompt-emoji'),
      h('span', { 'class': 'prompt-en', text: word.en })
    ]));

    var distractors = pickDistractors(word, 3, ex.tiers);
    var options = shuffle([word].concat(distractors));
    var list = h('div', { 'class': 'options-list' });
    var cards = [];
    var answered = false;

    options.forEach(function (opt) {
      var card = h('button', {
        'class': 'word-card',
        type: 'button',
        'aria-label': opt.ka,
        lang: 'ka',
        onclick: function () {
          if (answered) { return; }
          answered = true;
          if (opt.id === word.id) {
            cards.forEach(function (b) { b.disabled = true; });
            markCorrectCard(card);
            playWord(word);
            onResult({ correct: true, firstTry: true, announce: 'Correct! ' + word.ka + ' — ' + word.en });
          } else {
            var correctCard = cards[options.indexOf(word)];
            missTreatment(card, correctCard, cards, word);
            onResult({ correct: false, firstTry: false, announce: 'Almost! The answer is ' + word.ka + ' — ' + word.en });
          }
        }
      }, [h('span', { 'class': 'word-ka' }, [kaSpan(opt.ka)])]); // Georgian only — the reading variant
      cards.push(card);
      list.appendChild(h('div', { 'class': 'option-row' }, [
        card,
        audioBtn(opt.id, opt.ka, { small: true, label: 'Hear this word' })
      ]));
    });
    container.appendChild(list);
    var hint = kbdHint();
    if (hint) { container.appendChild(hint); }
    if (s) { s.optionButtons = cards; }
    playUiClip('Which word says it?');
  }

  /* ---------- exam / practice builders (data-driven from data.js recipes) ---------- */

  function buildLetterExam(pathGroup) {
    var group = alphaGroupById(pathGroup.groupId);
    var gi = C.alphabet.indexOf(group);
    var own = group.letters;
    var earlier = [];
    for (var j = 0; j < gi; j++) { earlier = earlier.concat(C.alphabet[j].letters); }
    var deck = shuffle(own);
    var oi = 0;
    function nextOwn() { var l = deck[oi % deck.length]; oi++; return l; }

    var exs = [];
    pathGroup.steps.exam.recipe.forEach(function (r) {
      for (var c = 0; c < (r.count || 1); c++) {
        if (r.type === 'hear_pick_letter' || r.type === 'letter_to_sound') {
          var fromEarlier = r.from === 'earlier-groups' && earlier.length > 0;
          var letter = fromEarlier ? shuffle(earlier)[0] : nextOwn();
          var pool = fromEarlier ? earlier : own;
          exs.push(makeEx(r.type, r.type === 'hear_pick_letter'
            ? { letter: letter, pool: pool }
            : { item: letter, pool: pool }));
        } else if (r.type === 'trace_letter') {
          exs.push(makeEx('trace_letter', { letter: nextOwn() }));
        } else if (r.type === 'build_syllable') {
          var ids = (r.syllablePool || []).slice();
          var syl = ids.length ? SYLLABLES[shuffle(ids)[0]] : null;
          if (syl) { exs.push(makeEx('build_syllable', { word: syl })); }
          else { exs.push(makeEx('hear_pick_letter', { letter: nextOwn(), pool: own })); }
        }
      }
    });
    return exs;
  }

  function earlierStepWords(step) {
    var idx = C.readingTrack.steps.indexOf(step);
    var pool = [];
    for (var j = 0; j < idx; j++) {
      C.readingTrack.steps[j].items.forEach(function (id) {
        var it = readItem(id);
        if (it && it.en) { pool.push(it); }
      });
    }
    return pool;
  }

  function buildReadingExercises(step, recipe) {
    var items = step.items.map(readItem).filter(function (x) { return !!x; });
    var words = items.filter(function (w) { return !!w.en; });
    var syls = items.filter(function (w) { return !w.en; });
    var sylPool = syls.length ? syls : (C.readingTrack ? C.readingTrack.syllables : []);
    var tiers = [words, READ_POOL];

    var wdeck = shuffle(words); var wi = 0;
    function nextW() { var w = wdeck[wi % wdeck.length]; wi++; return w; }
    var sdeck = shuffle(sylPool); var si = 0;
    function nextS() { var x = sdeck[si % sdeck.length]; si++; return x; }

    var chSet = {};
    sylPool.forEach(function (it) {
      String(it.ka).split('').forEach(function (ch) {
        if (LETTER_BY_KA[ch]) { chSet[ch] = true; }
      });
    });
    var stepLetters = Object.keys(chSet).map(function (ch) { return LETTER_BY_KA[ch]; });

    var exs = [];
    (recipe || []).forEach(function (r) {
      for (var c = 0; c < (r.count || 1); c++) {
        if (r.type === 'build_syllable') {
          var syl = r.syllablePool ? SYLLABLES[shuffle(r.syllablePool.slice())[0]] : nextS();
          if (syl) { exs.push(makeEx('build_syllable', { word: syl })); }
        } else if (r.type === 'letter_to_sound') {
          exs.push(makeEx('letter_to_sound', { item: nextS(), pool: sylPool }));
        } else if (r.type === 'hear_pick_letter') {
          var L = stepLetters.length ? shuffle(stepLetters)[0] : shuffle(ALL_LETTERS)[0];
          exs.push(makeEx('hear_pick_letter', { letter: L, pool: stepLetters }));
        } else if (r.type === 'read_word_pick_picture') {
          var w = nextW();
          if (r.from === 'earlier-steps') {
            var earlier = earlierStepWords(step);
            if (earlier.length) { w = shuffle(earlier)[0]; }
          }
          exs.push(makeEx('read_word_pick_picture', { word: w, tiers: tiers }));
        } else if (r.type === 'picture_pick_word') {
          exs.push(makeEx('picture_pick_word', { word: nextW(), tiers: tiers }));
        } else if (r.type === 'build_word') {
          var buildable = words.filter(function (bw) { return /^[ა-ჿ]{2,7}$/.test(bw.ka); });
          if (buildable.length) { exs.push(makeEx('build_word', { word: shuffle(buildable)[0] })); }
          else { exs.push(makeEx('picture_pick_word', { word: nextW(), tiers: tiers })); }
        } else if (r.type === 'match_pairs') {
          var pw = padPairWords(shuffle(words).slice(0, 5), [ALL_WORDS], 5);
          if (pw.length >= 3) { exs.push(makeEx('match_pairs', { words: pw })); }
        }
      }
    });
    return exs;
  }

  function startLettersExam(groupId) {
    var pg = findPathGroup(groupId);
    var group = pg && alphaGroupById(groupId);
    if (!pg || !group) { renderHome(); return; }
    startSession({
      mode: 'letters-exam',
      groupId: groupId,
      title: group.title + ' — Letter exam',
      exercises: buildLetterExam(pg)
    });
  }

  function startReadingPractice(stepId) {
    var step = findReadingStep(stepId);
    if (!step) { renderHome(); return; }
    startSession({
      mode: 'reading-practice',
      stepId: stepId,
      title: step.title + ' — Practice',
      exercises: buildReadingExercises(step, step.practice)
    });
  }

  function startReadingExam(stepId) {
    var step = findReadingStep(stepId);
    if (!step) { renderHome(); return; }
    startSession({
      mode: 'reading-exam',
      stepId: stepId,
      title: step.title + ' — Mini exam',
      exercises: buildReadingExercises(step, step.exam)
    });
  }

  /* ---------- v3: unit exam (data-driven from C.unitExamRecipe) ---------- */

  function buildUnitExam(unit) {
    var words = unitWords(unit);
    var idx = C.units.indexOf(unit);
    var earlier = [];
    for (var j = 0; j < idx; j++) { earlier = earlier.concat(unitWords(C.units[j])); }
    var tiers = [words, ALL_WORDS];
    var deck = shuffle(words);
    var wi = 0;
    function nextW() { var w = deck[wi % deck.length]; wi++; return w; }

    var exs = [];
    (C.unitExamRecipe || []).forEach(function (r) {
      for (var c = 0; c < (r.count || 1); c++) {
        var type = r.type;
        if (r.from === 'earlier-units') {
          // review sprinkle — the first unit has no earlier units, so it
          // draws from itself (never skipped, never a blocker)
          var pool = earlier.length ? earlier : words;
          exs.push(makeEx(type, { word: shuffle(pool)[0], tiers: [pool, ALL_WORDS] }));
          continue;
        }
        if (type === 'match_pairs') {
          var pw = padPairWords(shuffle(words).slice(0, 5), [ALL_WORDS], 5);
          if (pw.length >= 3) { exs.push(makeEx('match_pairs', { words: pw })); continue; }
          type = 'pick_picture';
        }
        if (type === 'build_word') {
          var buildable = words.filter(isBuildable);
          if (buildable.length) { exs.push(makeEx('build_word', { word: shuffle(buildable)[0] })); continue; }
          type = r.fallback || 'picture_pick_word';
        }
        exs.push(makeEx(type, { word: nextW(), tiers: tiers }));
      }
    });
    return exs;
  }

  function startUnitExam(unitId) {
    var unit = findUnit(unitId);
    if (!unit) { renderHome(); return; }
    startSession({
      mode: 'unit-exam',
      unitId: unitId,
      unit: unit,
      title: unit.title + ' — Unit exam',
      exercises: buildUnitExam(unit)
    });
  }

  /* ---------- path views (Letters & Reading) ---------- */

  /* One node on a step path. Everything is always tappable — done/next are
   * only highlights, never locks. */
  function pathNode(opts) {
    var wrap = h('span', { 'class': 'node-face-wrap', 'aria-hidden': 'true' });
    wrap.insertAdjacentHTML('beforeend', ringSvg(opts.done ? 1 : 0, opts.done));
    wrap.appendChild(h('span', { 'class': 'node-face' }, [opts.face]));
    if (opts.done) { wrap.appendChild(h('span', { 'class': 'check-badge', text: '✓' })); }
    if (opts.next) { wrap.appendChild(h('span', { 'class': 'next-pill', text: 'Up next' })); }
    var label = h('span', { 'class': 'node-label' }, [
      h('span', { 'class': 'node-title', text: opts.title }),
      typeof opts.sub === 'string' ? h('span', { 'class': 'node-sub', text: opts.sub }) : opts.sub
    ]);
    var btn = h('button', {
      'class': 'node-btn' + (opts.done ? ' done' : '') + (opts.next ? ' next' : ''),
      type: 'button',
      'aria-label': opts.aria,
      onclick: function () { navigate(opts.hash); }
    }, [wrap, label]);
    return h('li', { 'class': 'step-node' }, [btn]);
  }

  function renderLettersPath() {
    var sec = h('section', { 'class': 'view letters-view', role: 'region', 'aria-label': 'Letters path' });
    sec.appendChild(backLink('Home', '#/home'));
    sec.appendChild(h('h1', {}, [kaSpan(C.strings.letters), ' · Letters']));
    sec.appendChild(h('p', { 'class': 'alpha-intro', text: 'Meet the letters, trace them, then take a friendly exam — group by group, easy to hard.' }));
    sec.appendChild(h('button', {
      'class': 'btn btn-ghost', type: 'button',
      onclick: function () { navigate('#/alphabet'); }
    }, ['Browse all letters →']));

    var nextFound = false;
    function claimNext(done) {
      if (!done && !nextFound) { nextFound = true; return true; }
      return false;
    }

    ((C.lettersPath && C.lettersPath.groups) || []).forEach(function (g) {
      var group = alphaGroupById(g.groupId);
      if (!group) { return; }
      sec.appendChild(h('h2', { 'class': 'path-group-title', text: g.order + ' · ' + group.title }));
      var ol = h('ol', { 'class': 'step-path' });

      var meetDone = state.lettersMeetDone.indexOf(g.groupId) !== -1;
      var traceDone = state.lettersTraceDone.indexOf(g.groupId) !== -1;
      var examQs = g.steps.exam.recipe.reduce(function (n, r) { return n + (r.count || 1); }, 0);
      var examStars = state.lettersExamStars[g.groupId] || 0;
      var examDone = examStars >= 1;
      var groupTag = 'group ' + g.order + ', ' + group.title;
      var meetNext = claimNext(meetDone);
      var traceNext = claimNext(traceDone);
      var examNext = claimNext(examDone);

      ol.appendChild(pathNode({
        face: h('span', { 'class': 'node-glyph' }, [kaSpan(group.letters[0].ka)]),
        title: g.steps.meet.title,
        sub: g.steps.meet.sub || group.letters.length + ' letters',
        done: meetDone, next: meetNext,
        hash: '#/letters/' + g.groupId + '/meet',
        aria: g.steps.meet.title + ' — ' + groupTag + (meetDone ? ', completed' : meetNext ? ', up next' : '')
      }));
      ol.appendChild(pathNode({
        face: h('span', { 'class': 'node-emoji', text: '✍️' }),
        title: g.steps.write.title,
        sub: g.steps.write.sub || 'Trace each letter',
        done: traceDone, next: traceNext,
        hash: '#/letters/' + g.groupId + '/trace',
        aria: g.steps.write.title + ' — ' + groupTag + (traceDone ? ', completed' : traceNext ? ', up next' : '')
      }));
      ol.appendChild(pathNode({
        face: h('span', { 'class': 'node-emoji', text: '🏅' }),
        title: g.steps.exam.title,
        sub: examStars > 0 ? starsRow(examStars) : 'About ' + examQs + ' questions',
        done: examDone, next: examNext,
        hash: '#/letters/' + g.groupId + '/exam',
        aria: g.steps.exam.title + ' — ' + groupTag +
          (examDone ? ', completed, best ' + examStars + ' of 3 stars' : examNext ? ', up next' : '')
      }));
      sec.appendChild(ol);
    });

    setView(sec, 'wide-path');
  }

  function renderReadingPath() {
    var sec = h('section', { 'class': 'view reading-view', role: 'region', 'aria-label': 'Reading path' });
    sec.appendChild(backLink('Home', '#/home'));
    sec.appendChild(h('h1', {}, [kaSpan(C.strings.reading), ' · Reading']));
    sec.appendChild(h('p', { 'class': 'alpha-intro', text: 'Sound out real Georgian — from tiny syllables to long, delicious words.' }));

    var nextFound = false;
    function claimNext(done) {
      if (!done && !nextFound) { nextFound = true; return true; }
      return false;
    }

    ((C.readingTrack && C.readingTrack.steps) || []).forEach(function (step, i) {
      sec.appendChild(h('h2', { 'class': 'path-group-title', text: (i + 1) + ' · ' + step.title }));
      var ol = h('ol', { 'class': 'step-path' });

      var cardsDone = state.readingCardsDone.indexOf(step.id) !== -1;
      var practiceDone = state.readingPracticeDone.indexOf(step.id) !== -1;
      var examQs = step.exam.reduce(function (n, r) { return n + (r.count || 1); }, 0);
      var examStars = state.readingExamStars[step.id] || 0;
      var examDone = examStars >= 1;
      var cardsNext = claimNext(cardsDone);
      var practiceNext = claimNext(practiceDone);
      var examNext = claimNext(examDone);

      ol.appendChild(pathNode({
        face: h('span', { 'class': 'node-emoji', text: '🃏' }),
        title: 'Word cards',
        sub: step.items.length + ' cards',
        done: cardsDone, next: cardsNext,
        hash: '#/reading/' + step.id + '/cards',
        aria: 'Word cards — ' + step.title + (cardsDone ? ', completed' : cardsNext ? ', up next' : '')
      }));
      ol.appendChild(pathNode({
        face: h('span', { 'class': 'node-emoji', text: '🧩' }),
        title: 'Practice',
        sub: 'Playful exercises',
        done: practiceDone, next: practiceNext,
        hash: '#/reading/' + step.id + '/practice',
        aria: 'Practice — ' + step.title + (practiceDone ? ', completed' : practiceNext ? ', up next' : '')
      }));
      ol.appendChild(pathNode({
        face: h('span', { 'class': 'node-emoji', text: '🏅' }),
        title: 'Mini exam',
        sub: examStars > 0 ? starsRow(examStars) : 'About ' + examQs + ' questions',
        done: examDone, next: examNext,
        hash: '#/reading/' + step.id + '/exam',
        aria: 'Mini exam — ' + step.title +
          (examDone ? ', completed, best ' + examStars + ' of 3 stars' : examNext ? ', up next' : '')
      }));
      sec.appendChild(ol);
    });

    setView(sec, 'wide-path');
  }

  /* ---------- Meet the letters (deck) ---------- */

  function renderMeet(groupId) {
    var group = alphaGroupById(groupId);
    if (!group) { renderHome(); return; }
    var sec = h('section', { 'class': 'view meet-view', role: 'region', 'aria-label': 'Meet the letters' });
    sec.appendChild(backLink('Letters', '#/letters'));
    sec.appendChild(h('h1', { text: group.title + ' · Meet the letters' }));
    var deck = h('div', { 'class': 'deck-area' });
    sec.appendChild(deck);

    var current = 0;

    function finish() {
      var first = pushOnce(state.lettersMeetDone, groupId);
      save();
      addXP(first ? 15 : 5);
      playPraise();
      toast('Group done! 🎉');
      navigate('#/letters');
    }

    /* focusDir ('prev'|'next') — set on user navigation so keyboard focus
     * lands on the new card's matching control instead of dropping to body */
    function show(focusDir) {
      deck.innerHTML = '';
      var letter = group.letters[current];
      recordLetterOpened(letter);
      var ex = letter.example;
      var vocabMatch = vocabEmojiFor(ex.ka);

      var exampleBits = [];
      if (vocabMatch) { exampleBits.push(emojiSpan(vocabMatch.emoji, ex.en, 'prompt-emoji')); }
      exampleBits.push(h('span', { 'class': 'example-ka' }, [kaSpan(ex.ka)]));
      exampleBits.push(audioBtn(exampleAudioId(ex.ka, vocabMatch), ex.ka, { small: true, label: 'Hear the example word' }));

      var meetCard = h('div', { 'class': 'deck-card' }, [
        h('div', { 'class': 'deck-glyph-row' }, [
          h('span', { 'class': 'deck-glyph' }, [kaSpan(letter.ka)]),
          audioBtn(letterAudioId(letter), letter.ka, { label: 'Hear the letter' })
        ]),
        h('div', { 'class': 'dialog-name', text: letter.name + ' · ' + letter.translit }),
        h('div', { 'class': 'dialog-ipa', text: 'sound: /' + letter.ipa + '/' }),
        h('div', { 'class': 'example-row' }, exampleBits),
        h('div', { 'class': 'example-en', text: ex.translit + ' — ' + ex.en })
      ]);
      deckSwipe(meetCard,
        function () { if (current > 0) { current--; show('prev'); } },
        function () { if (current < group.letters.length - 1) { current++; show('next'); } });
      deck.appendChild(meetCard);

      var nav = h('div', { 'class': 'deck-nav' });
      var prevBtn = h('button', {
        'class': 'dialog-arrow', type: 'button',
        'aria-label': 'Previous letter',
        disabled: current === 0 ? true : null,
        onclick: function () { if (current > 0) { current--; show('prev'); } }
      }, [h('span', { 'aria-hidden': 'true', text: '←' })]);
      nav.appendChild(prevBtn);
      nav.appendChild(h('span', { 'class': 'dialog-ipa deck-counter', text: (current + 1) + ' / ' + group.letters.length }));
      var fwdBtn;
      if (current < group.letters.length - 1) {
        fwdBtn = h('button', {
          'class': 'dialog-arrow', type: 'button',
          'aria-label': 'Next letter',
          onclick: function () { current++; show('next'); }
        }, [h('span', { 'aria-hidden': 'true', text: '→' })]);
      } else {
        fwdBtn = h('button', {
          'class': 'btn btn-primary', type: 'button',
          onclick: finish
        }, ['Finish ✓']);
      }
      nav.appendChild(fwdBtn);
      deck.appendChild(nav);
      readyPulse(fwdBtn);
      if (focusDir) {
        (focusDir === 'prev' && !prevBtn.disabled ? prevBtn : fwdBtn).focus();
      }
      announce('Letter ' + letter.name + ', ' + letter.translit + '. Card ' + (current + 1) + ' of ' + group.letters.length);
      playLetter(letter);
    }

    function onKey(e) {
      if (!document.body.contains(sec)) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'ArrowLeft' && current > 0) { e.preventDefault(); current--; show('prev'); }
      else if (e.key === 'ArrowRight' && current < group.letters.length - 1) { e.preventDefault(); current++; show('next'); }
    }
    document.addEventListener('keydown', onKey);

    setView(sec, '');
    show();
  }

  /* ---------- Write it (tracing view) ---------- */

  function renderTrace(groupId) {
    var group = alphaGroupById(groupId);
    if (!group) { renderHome(); return; }
    var sec = h('section', { 'class': 'view trace-view', role: 'region', 'aria-label': 'Write the letters' });
    sec.appendChild(backLink('Letters', '#/letters'));
    sec.appendChild(h('h1', { text: group.title + ' · Write it' }));
    var counter = h('p', { 'class': 'alpha-intro trace-counter' });
    sec.appendChild(counter);
    var area = h('div', { 'class': 'trace-area' });
    sec.appendChild(area);

    var idx = 0;

    function finishTrace() {
      var first = pushOnce(state.lettersTraceDone, groupId);
      save();
      addXP(first ? 15 : 5);
      counter.textContent = '';
      area.innerHTML = '';
      var fin = h('div', { 'class': 'finish' }, [
        h('p', { 'class': 'finish-title' }, [kaSpan(C.strings.excellent), ' · Excellent!']),
        h('p', { 'class': 'finish-note', text: 'You traced all ' + group.letters.length + ' letters!' })
      ]);
      var actions = h('div', { 'class': 'finish-actions' });
      actions.appendChild(h('button', {
        'class': 'btn btn-primary btn-block', type: 'button',
        onclick: function () { navigate('#/letters'); }
      }, ['Back to Letters']));
      actions.appendChild(h('button', {
        'class': 'btn btn-secondary btn-block', type: 'button',
        onclick: function () { idx = 0; show(); }
      }, ['Trace again']));
      fin.appendChild(actions);
      area.appendChild(fin);
      confettiBurst(fin);
      playPraise();
      announce('Excellent! You traced all the letters in this group.');
      var firstBtn = actions.querySelector('button');
      if (firstBtn) { firstBtn.focus(); }
    }

    function show() {
      area.innerHTML = '';
      var letter = group.letters[idx];
      counter.textContent = 'Letter ' + (idx + 1) + ' of ' + group.letters.length;
      var tc = makeTraceCanvas(letter);
      var card = h('div', { 'class': 'trace-card' }, [tc.el]);
      area.appendChild(card);

      var doneBtn = h('button', {
        'class': 'btn btn-primary', type: 'button',
        onclick: function () {
          if (doneBtn.disabled) { return; }
          doneBtn.disabled = true;
          if (tc.getStrokeCount() > 0) { recordTraced(letter.ka); }
          var p = playPraise();
          toast((p ? p.ka + ' ' : '') + 'Beautiful ' + letter.ka + '!');
          confettiBurst(card);
          announce('Beautiful ' + letter.ka + '!');
          window.setTimeout(function () {
            if (!document.body.contains(sec)) { return; }
            idx++;
            if (idx < group.letters.length) { show(); } else { finishTrace(); }
          }, prefersReducedMotion() ? 400 : 900);
        }
      }, ['Done ✓']); // always enabled — skipping the drawing is fine, never judged

      area.appendChild(h('div', { 'class': 'trace-controls' }, [
        audioBtn(letterAudioId(letter), letter.ka, { label: 'Hear the letter' }),
        watchDrawBtn(tc, letter),
        h('button', {
          'class': 'btn btn-ghost', type: 'button',
          onclick: function () { tc.clear(); }
        }, ['Clear']),
        doneBtn
      ]));
      playLetter(letter);
    }

    setView(sec, '');
    show();
  }

  /* ---------- Reading word cards (deck) ---------- */

  var soundToken = 0;

  function soundOut(item, letterBtns) {
    var token = ++soundToken;
    var chars = String(item.ka).split('');
    var reduced = prefersReducedMotion();
    if (reduced) { letterBtns.forEach(function (b) { b.classList.add('lit'); }); }
    var i = 0;
    function step() {
      if (token !== soundToken) { return; }
      if (!letterBtns[0] || !document.body.contains(letterBtns[0])) { return; }
      if (i < chars.length) {
        if (!reduced) {
          letterBtns.forEach(function (b, j) { b.classList.toggle('lit', j === i); });
        }
        var ch = chars[i];
        playAudio((C.audioIds.letters && C.audioIds.letters[ch]) || null, ch);
        i++;
        window.setTimeout(step, 450);
      } else {
        window.setTimeout(function () {
          if (token !== soundToken) { return; }
          letterBtns.forEach(function (b) { b.classList.remove('lit'); });
          playAudio(item.id, item.ka);
        }, 500);
      }
    }
    step();
  }

  /* swipe left/right on a deck card → next/prev (L3). Taps on buttons
   * inside the card are ignored. */
  function deckSwipe(el, onPrev, onNext) {
    var startX = null, startY = null;
    el.addEventListener('pointerdown', function (e) {
      if (e.target && e.target.closest && e.target.closest('button')) { startX = null; return; }
      startX = e.clientX;
      startY = e.clientY;
    });
    el.addEventListener('pointerup', function (e) {
      if (startX === null) { return; }
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) { onPrev(); } else { onNext(); }
      }
    });
  }

  /* after the card has had a beat, the forward arrow does a small "ready"
   * pulse — an invitation, never a lock (L2) */
  function readyPulse(btn) {
    if (prefersReducedMotion()) { return; }
    window.setTimeout(function () {
      if (document.body.contains(btn)) { btn.classList.add('ready-pulse'); }
    }, 1200);
  }

  /* One card deck for BOTH the Reading track and the unit word cards.
   * opts: sectionClass, ariaLabel, backLabel, backHash, heading, items,
   *       mode ('reading' → tap-a-letter + Show hint;
   *             'vocab'   → meaning always visible + auto word audio),
   *       markDone() -> true on first completion, doneToast */
  function renderCardsDeck(opts) {
    var items = opts.items;
    var sec = h('section', { 'class': 'view ' + opts.sectionClass, role: 'region', 'aria-label': opts.ariaLabel });
    sec.appendChild(backLink(opts.backLabel, opts.backHash));
    sec.appendChild(h('h1', { text: opts.heading }));
    var deck = h('div', { 'class': 'deck-area' });
    sec.appendChild(deck);

    var current = 0;

    function finish() {
      var first = opts.markDone();
      save();
      addXP(first ? 15 : 5);
      playPraise();
      toast(opts.doneToast || 'Cards done! 🎉', { keep: true });
      navigate(opts.backHash);
    }

    function goPrev() { if (current > 0) { current--; show('prev'); } }
    function goNext() { if (current < items.length - 1) { current++; show('next'); } }

    /* focusDir ('prev'|'next') — set on user navigation so keyboard focus
     * lands on the new card's matching control instead of dropping to body */
    function show(focusDir) {
      soundToken++; // cancel any running sound-out
      deck.innerHTML = '';
      var item = items[current];
      var chars = String(item.ka).split('');
      var allGeorgian = chars.every(function (ch) { return ch >= 'ა' && ch <= 'ჿ'; });

      var letterBtns = [];
      var wordRow = h('div', { 'class': 'read-word' + (chars.length > 8 ? ' read-word--long' : ''), lang: 'ka' });
      chars.forEach(function (ch) {
        if (!(ch >= 'ა' && ch <= 'ჿ')) {
          // spaces / punctuation in phrases are plain, not tappable
          wordRow.appendChild(h('span', { 'class': 'read-sep ka', 'aria-hidden': 'true', text: ch }));
          return;
        }
        var known = LETTER_BY_KA[ch];
        var lb = h('button', {
          'class': 'read-letter ka',
          type: 'button',
          lang: 'ka',
          'aria-label': 'Letter ' + (known ? known.name + ', ' + known.translit : ch),
          onclick: function () {
            soundToken++;
            letterBtns.forEach(function (b) { b.classList.remove('lit'); });
            lb.classList.add('lit');
            playAudio((C.audioIds.letters && C.audioIds.letters[ch]) || null, ch);
          }
        }, [ch]);
        letterBtns.push(lb);
        wordRow.appendChild(lb);
      });

      var audioRow = h('div', { 'class': 'card-audio-row' });
      if (allGeorgian) {
        audioRow.appendChild(h('button', {
          'class': 'btn btn-secondary', type: 'button',
          onclick: function () { soundOut(item, letterBtns); }
        }, [h('span', { 'aria-hidden': 'true', text: '🔍 ' }), 'Sound it out']));
      }
      audioRow.appendChild(audioBtn(item.id, item.ka, { label: 'Hear the whole word' }));

      var cardBits = [
        item.emoji
          ? emojiSpan(item.emoji, item.en, 'deck-emoji')
          : emojiSpan('🔤', 'syllable', 'deck-emoji'),
        wordRow,
        audioRow
      ];

      if (opts.mode === 'vocab') {
        // learning, not testing — the meaning is always on the card
        cardBits.push(h('p', { 'class': 'translit deck-meaning', text: item.translit + ' — ' + item.en }));
      } else {
        var hintLine = h('p', { 'class': 'translit hint-line', tabindex: '-1', text: item.translit + (item.en ? ' — ' + item.en : '') });
        var hintBtn = h('button', {
          'class': 'btn btn-ghost', type: 'button',
          onclick: function () {
            hintBtn.parentNode.replaceChild(hintLine, hintBtn);
            hintLine.focus(); // keep keyboard focus on the revealed hint
          }
        }, ['Show hint']);
        cardBits.push(hintBtn);
      }

      var card = h('div', { 'class': 'deck-card' }, cardBits);
      deckSwipe(card, goPrev, goNext);
      deck.appendChild(card);

      var nav = h('div', { 'class': 'deck-nav' });
      var prevBtn = h('button', {
        'class': 'dialog-arrow', type: 'button',
        'aria-label': 'Previous card',
        disabled: current === 0 ? true : null,
        onclick: goPrev
      }, [h('span', { 'aria-hidden': 'true', text: '←' })]);
      nav.appendChild(prevBtn);
      nav.appendChild(h('span', { 'class': 'dialog-ipa deck-counter', text: (current + 1) + ' / ' + items.length }));
      var fwdBtn;
      if (current < items.length - 1) {
        fwdBtn = h('button', {
          'class': 'dialog-arrow', type: 'button',
          'aria-label': 'Next card',
          onclick: goNext
        }, [h('span', { 'aria-hidden': 'true', text: '→' })]);
      } else {
        fwdBtn = h('button', {
          'class': 'btn btn-primary', type: 'button',
          onclick: finish
        }, ['Finish ✓']);
      }
      nav.appendChild(fwdBtn);
      deck.appendChild(nav);
      readyPulse(fwdBtn);
      if (focusDir) {
        (focusDir === 'prev' && !prevBtn.disabled ? prevBtn : fwdBtn).focus();
      }
      announce('Card ' + (current + 1) + ' of ' + items.length + ': ' + item.translit +
        (opts.mode === 'vocab' && item.en ? ', ' + item.en : ''));
      if (opts.mode === 'vocab') { playWord(item); } // hear every word as you meet it
    }

    function onKey(e) {
      if (!document.body.contains(sec)) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    }
    document.addEventListener('keydown', onKey);

    setView(sec, '');
    show();
  }

  function renderReadingCards(stepId) {
    var step = findReadingStep(stepId);
    if (!step) { renderHome(); return; }
    renderCardsDeck({
      sectionClass: 'reading-cards-view',
      ariaLabel: 'Word cards',
      backLabel: 'Reading',
      backHash: '#/reading',
      heading: step.title + ' · Word cards',
      items: step.items.map(readItem).filter(function (x) { return !!x; }),
      mode: 'reading',
      markDone: function () { return pushOnce(state.readingCardsDone, stepId); }
    });
  }

  /* v3 — unit word cards: meet every word BEFORE practicing it (M5) */
  function renderUnitCards(unitId, lessonId) {
    var unit = findUnit(unitId);
    var found = findLesson(lessonId);
    if (!unit || !found || found.unit !== unit) { renderHome(); return; }
    renderCardsDeck({
      sectionClass: 'reading-cards-view unit-cards-view',
      ariaLabel: 'Word cards — ' + found.lesson.title,
      backLabel: unit.title,
      backHash: '#/unit/' + unit.id,
      heading: found.lesson.title + ' · Word cards',
      items: wordsOf(found.lesson.items),
      mode: 'vocab',
      markDone: function () { return pushOnce(state.unitCardsDone, lessonId); }
    });
  }

  /* ================================================================== *
   * v3 — My Treasures, daily welcome gift, boot wiring
   * ================================================================== */

  function starsBreakdown() {
    var lessons = 0, unitEx = 0, letters = 0, reading = 0;
    Object.keys(state.stars).forEach(function (k) { lessons += state.stars[k] || 0; });
    Object.keys(state.unitExamStars).forEach(function (k) { unitEx += state.unitExamStars[k] || 0; });
    Object.keys(state.lettersExamStars).forEach(function (k) { letters += state.lettersExamStars[k] || 0; });
    Object.keys(state.readingExamStars).forEach(function (k) { reading += state.readingExamStars[k] || 0; });
    return { lessons: lessons, unitEx: unitEx, letters: letters, reading: reading, practice: state.practiceStars || 0 };
  }

  function treasureSection(title, children) {
    var box = h('div', { 'class': 'treasure-section' });
    box.appendChild(h('h2', { text: title }));
    (children || []).forEach(function (c) { if (c) { box.appendChild(c); } });
    return box;
  }

  function renderTreasures() {
    var sec = h('section', { 'class': 'view treasures-view', role: 'region', 'aria-label': 'My treasures' });
    sec.appendChild(backLink('Home', '#/home'));
    sec.appendChild(h('h1', {}, ['🏆 ', kaSpan(C.strings.treasures), ' · My treasures']));
    sec.appendChild(h('p', { 'class': 'alpha-intro', text: 'Everything here only ever grows. ☀️ Day ' +
      Math.max(1, state.daysPlayed.length) + ' of your adventure.' }));

    /* stars */
    var b = starsBreakdown();
    sec.appendChild(treasureSection('⭐ Stars — ' + totalStars(), [
      h('p', { 'class': 'treasure-line', text: 'Lessons ' + b.lessons + ' · Unit exams ' + b.unitEx +
        ' · Letters ' + b.letters + ' · Reading ' + b.reading + ' · Practice ' + b.practice })
    ]));

    /* XP + milestones */
    var mBits = XP_MILESTONES.map(function (m) {
      return (state.xp >= m.at ? m.label + ' ✓' : m.label + ' at ' + m.at);
    }).join(' · ');
    sec.appendChild(treasureSection('⚡ ' + state.xp + ' XP', [
      h('p', { 'class': 'treasure-line', text: mBits })
    ]));

    /* badges */
    var badgeRow = h('div', { 'class': 'badges-row badges-row--left', role: 'list', 'aria-label': 'Badges earned' });
    if (state.badges.length) {
      state.badges.forEach(function (id) {
        var bd = BADGES[id];
        if (!bd) { return; }
        badgeRow.appendChild(h('span', { 'class': 'badge-chip', role: 'listitem', 'aria-label': 'Badge: ' + bd.name },
          [h('span', { 'aria-hidden': 'true', text: bd.emoji }), h('span', { text: bd.name })]));
      });
    } else {
      badgeRow.appendChild(h('p', { 'class': 'treasure-line', text: 'Your first badge is waiting in your very first lesson!' }));
    }
    sec.appendChild(treasureSection('🎖️ Badges — ' + state.badges.length, [badgeRow]));

    /* crowns */
    var crownRow = h('div', { 'class': 'badges-row badges-row--left', role: 'list', 'aria-label': 'Crowned units' });
    if (state.crowns.length) {
      state.crowns.forEach(function (uid) {
        var u = findUnit(uid);
        if (!u) { return; }
        crownRow.appendChild(h('span', { 'class': 'badge-chip', role: 'listitem', 'aria-label': 'Crowned unit: ' + u.title },
          [h('span', { 'aria-hidden': 'true', text: '👑 ' + u.emoji }), h('span', { text: u.title })]));
      });
    } else {
      crownRow.appendChild(h('p', { 'class': 'treasure-line', text: 'Finish a unit’s lessons and its exam to crown it!' }));
    }
    sec.appendChild(treasureSection('👑 Crowns — ' + state.crowns.length, [crownRow]));

    /* sticker album */
    var album = h('div', { 'class': 'sticker-grid', role: 'list', 'aria-label': 'Sticker album' });
    (C.stickers || []).forEach(function (st) {
      var owned = state.stickers.indexOf(st.id) !== -1;
      album.appendChild(h('span', {
        'class': 'sticker-tile' + (owned ? ' owned' : ''),
        role: 'listitem',
        'aria-label': owned ? 'Sticker: ' + st.name : 'Sticker not collected yet'
      }, [
        h('span', { 'class': 'sticker-emoji', 'aria-hidden': 'true', text: owned ? st.emoji : '?' }),
        h('span', { 'class': 'sticker-name', text: owned ? st.name : '· · ·' })
      ]));
    });
    sec.appendChild(treasureSection('🎁 Sticker album — ' + state.stickers.length + ' of ' + (C.stickers || []).length, [
      h('p', { 'class': 'treasure-line', text: 'Baba has a gift waiting every day you visit.' }),
      album
    ]));

    /* my dictionary */
    var dict = h('div', { 'class': 'dict-list' });
    if (state.wodCollected.length) {
      state.wodCollected.forEach(function (id) {
        var w = C.vocab[id];
        if (!w) { return; }
        dict.appendChild(h('div', { 'class': 'dict-row' }, [
          emojiSpan(w.emoji, '', 'dict-emoji'),
          h('span', { 'class': 'dict-word' }, [kaSpan(w.ka), h('span', { 'class': 'entry-sub', text: w.translit + ' — ' + w.en })]),
          audioBtn(w.id, w.ka, { small: true, label: 'Hear ' + w.en })
        ]));
      });
    } else {
      dict.appendChild(h('p', { 'class': 'treasure-line', text: 'Collect the word of the day on the home screen to start your dictionary!' }));
    }
    sec.appendChild(treasureSection('📖 ' + C.strings.dictionary + ' · My dictionary — ' + state.wodCollected.length, [dict]));

    setView(sec, '');
  }

  /* ---------- daily welcome gift (4-2) — never a word about missed days ---------- */

  function showDailyGift() {
    var day = state.daysPlayed.length;
    var st = grantSticker(true); // quiet — the dialog IS the celebration
    var goldenDay = !st;
    if (goldenDay) { addXP(10); }

    var backdrop = h('div', { 'class': 'modal-backdrop' });
    var dialog = h('div', { 'class': 'letter-dialog gift-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Daily gift' });
    backdrop.appendChild(dialog);

    function close() {
      document.removeEventListener('keydown', onKey, true);
      if (backdrop.parentNode) { backdrop.parentNode.removeChild(backdrop); }
      /* restore keyboard focus into the page (same idea as openLetterDialog):
       * the gift has no trigger element, so land on the hero card / first control */
      var back = document.querySelector('.hero-card') ||
                 document.querySelector('#app button, #app a[href]');
      if (back && back.focus) { back.focus(); }
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var focusables = dialog.querySelectorAll('button:not([disabled])');
        if (!focusables.length) { return; }
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    dialog.appendChild(h('p', { 'class': 'finish-title gift-title' }, [kaSpan(C.vocab.gamarjoba.ka + '!'), ' · Good to see you!']));
    dialog.appendChild(h('p', { 'class': 'gift-day', text: 'Day ' + day + '! Baba’s gift for you:' }));
    if (st) {
      dialog.appendChild(h('div', { 'class': 'gift-sticker' }, [
        h('span', { 'class': 'gift-emoji', 'aria-hidden': 'true', text: st.emoji }),
        h('span', { 'class': 'gift-name', text: st.name })
      ]));
    } else {
      dialog.appendChild(h('div', { 'class': 'gift-sticker' }, [
        h('span', { 'class': 'gift-emoji', 'aria-hidden': 'true', text: '🌟' }),
        h('span', { 'class': 'gift-name', text: 'Golden borjgali day — +10 XP!' })
      ]));
    }
    var okBtn = h('button', {
      'class': 'btn btn-primary btn-block', type: 'button',
      onclick: function () {
        close();
        toast(st ? ('🎁 ' + st.emoji + ' ' + st.name + ' added to your treasures!') : '🌟 +10 XP added!');
      }
    }, ['Add to my treasures ✓']);
    dialog.appendChild(okBtn);

    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) { close(); } });
    document.addEventListener('keydown', onKey, true);
    confettiBurst(dialog);
    okBtn.focus();
    announce('Day ' + day + ' of your adventure! ' + (st ? 'New sticker: ' + st.name : 'Golden borjgali day, plus ten XP') + '.');
    playUiClip('A gift for you!', function () {
      if (document.body.contains(dialog)) { playPraise(); }
    });
  }

  /* record today's visit; true when this is the first visit of the day.
   * Called BEFORE the first route() so home's "Day N" hero and the gift
   * dialog always agree on the day number. */
  function recordTodayPlayed() {
    var today = todayKey();
    if (state.daysPlayed.indexOf(today) !== -1) { return false; }
    state.daysPlayed.push(today); // append-only; gaps are nobody's business
    save();
    return true;
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  /* header chips are real buttons now (M2) — they open My treasures */
  ['chip-stars', 'chip-xp'].forEach(function (id) {
    var chip = document.getElementById(id);
    if (chip && chip.tagName === 'BUTTON') {
      chip.addEventListener('click', function () { navigate('#/treasures'); });
    }
  });

  updateChips();
  var firstVisitToday = recordTodayPlayed(); // before route(): "Day N" must be current on first render
  route();
  if (firstVisitToday) { showDailyGift(); }

})();
