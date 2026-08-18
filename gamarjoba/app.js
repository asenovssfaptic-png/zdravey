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
      readingExamStars: {}   // stepId -> best stars 1..3, max-merge only
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

  function toast(msg) {
    var t = h('div', { 'class': 'toast', text: msg });
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

  function speak(text) {
    if (!kaVoice) { return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.voice = kaVoice;
      u.lang = kaVoice.lang;
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    } catch (e) { /* stay silent */ }
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

  function playAudio(audioId, kaText) {
    stopSpeech();
    if (currentClip) { try { currentClip.pause(); } catch (e) {} }
    if (!audioId || audioBad[audioId] || !AUDIO_SET[audioId]) { speak(kaText); return; }
    var a = audioCache[audioId];
    if (!a) {
      a = new Audio('audio/ka/' + audioId + '.mp3');
      a.preload = 'auto';
      a.addEventListener('error', function () { audioBad[audioId] = true; });
      audioCache[audioId] = a;
    }
    currentClip = a;
    try {
      a.currentTime = 0;
      var p = a.play();
      if (p && p.catch) { p.catch(function () { /* autoplay blocked: stay quiet */ }); }
    } catch (e) { speak(kaText); }
  }

  function letterAudioId(letter) {
    return (C.audioIds && C.audioIds.letters && C.audioIds.letters[letter.ka]) || null;
  }

  function playWord(w) { playAudio(w.id, w.ka); }
  function playLetter(l) { playAudio(letterAudioId(l), l.ka); }

  /* letters have no `id`; anything speakable goes through here */
  function playItem(item) {
    if (!item) { return; }
    var aid = item.id;
    if (!aid && C.audioIds && C.audioIds.letters && C.audioIds.letters[item.ka]) {
      aid = C.audioIds.letters[item.ka];
    }
    playAudio(aid, item.ka);
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
        if ((state.stars[l.id] || 0) >= 1) { ids = ids.concat(l.items); }
      });
    });
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
    return t;
  }

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
    chipStars.setAttribute('aria-label', 'Total stars: ' + stars);
    chipXp.setAttribute('aria-label', 'Total XP: ' + xp);
    if (shownStats.stars !== null && stars > shownStats.stars) { popChip(chipStars); }
    if (shownStats.xp !== null && xp > shownStats.xp) { popChip(chipXp); }
    shownStats.stars = stars;
    shownStats.xp = xp;
  }

  function addXP(n) {
    if (n <= 0) { return; }
    state.xp += n;
    save();
    updateChips();
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

  function maybeCrown(unit) {
    if (state.crowns.indexOf(unit.id) !== -1) { return; }
    if (!unitCompleted(unit)) { return; }
    state.crowns.push(unit.id);
    save();
    toast('👑 ' + unit.title + ' complete!');
    earnBadge('first-crown');
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
    } else if ((m = hash.match(/^#\/unit\/([\w-]+)$/))) {
      renderUnit(m[1]);
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

  function entryCard(emoji, kaLabel, enLabel, sub, hash, ariaLabel) {
    return h('button', {
      'class': 'entry-card',
      type: 'button',
      'aria-label': ariaLabel,
      onclick: function () { navigate(hash); }
    }, [
      h('span', { 'class': 'entry-emoji', 'aria-hidden': 'true', text: emoji }),
      h('span', {}, [
        kaSpan(kaLabel), ' · ' + enLabel,
        h('span', { 'class': 'entry-sub', text: sub })
      ]),
      h('span', { 'class': 'chevron', 'aria-hidden': 'true', text: '›' })
    ]);
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

    sec.appendChild(entryCard('🔤', C.strings.letters, 'Letters', 'Read & write all 33 letters, step by step', '#/letters', 'Open the Letters path'));
    sec.appendChild(entryCard('📖', C.strings.reading, 'Reading', 'Sound out your first Georgian words', '#/reading', 'Open the Reading path'));
    sec.appendChild(entryCard('🧠', C.strings.practice, 'Review', 'Mix everything you know', '#/practice', 'Practice everything you have learned'));

    var path = h('ol', { 'class': 'home-path' });
    C.units.forEach(function (u, i) {
      var done = lessonsDone(u);
      var total = u.lessons.length;
      var completed = unitCompleted(u) || state.crowns.indexOf(u.id) !== -1;
      var upcoming = !completed && unitUpcoming(i);
      var current = !completed && !upcoming;
      var crowned = state.crowns.indexOf(u.id) !== -1;

      var bubble = h('button', {
        'class': 'unit-bubble' + (completed ? ' completed' : '') + (upcoming ? ' upcoming' : '') + (current ? ' current' : ''),
        type: 'button',
        'aria-label': 'Unit: ' + u.title + ', ' + done + ' of ' + total + ' lessons complete' + (crowned ? ', crowned' : ''),
        onclick: (function (unitId) { return function () { navigate('#/unit/' + unitId); }; })(u.id)
      });
      bubble.insertAdjacentHTML('beforeend', ringSvg(total ? done / total : 0, completed));
      bubble.appendChild(h('span', { 'class': 'bubble-face', 'aria-hidden': 'true', text: u.emoji }));
      if (crowned) {
        bubble.appendChild(h('span', { 'class': 'unit-crown', 'aria-hidden': 'true', text: '👑' }));
      }

      if (current && !done) {
        bubble.appendChild(h('span', { 'class': 'next-pill', text: 'Up next' }));
      }

      var stop = h('div', { 'class': 'unit-stop' }, [
        bubble,
        h('span', { 'class': 'unit-title', text: u.title }),
        h('span', { 'class': 'unit-sub', text: done + ' / ' + total + ' lessons' })
      ]);
      path.appendChild(h('li', { 'class': 'unit-node' }, [stop]));
    });
    sec.appendChild(path);

    if (state.badges.length) {
      var row = h('div', { 'class': 'badges-row', role: 'list', 'aria-label': 'Badges earned' });
      state.badges.forEach(function (id) {
        var b = BADGES[id];
        if (!b) { return; }
        row.appendChild(h('span', {
          'class': 'badge-chip',
          role: 'listitem',
          'aria-label': 'Badge: ' + b.name
        }, [
          h('span', { 'aria-hidden': 'true', text: b.emoji }),
          h('span', { text: b.name })
        ]));
      });
      sec.appendChild(row);
    }

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

  function renderUnit(unitId) {
    var unit = findUnit(unitId);
    if (!unit) { renderHome(); return; }
    var idx = C.units.indexOf(unit);

    var sec = h('section', { 'class': 'view unit-view', role: 'region', 'aria-label': 'Unit: ' + unit.title });
    sec.appendChild(h('button', {
      'class': 'back-link', type: 'button',
      onclick: function () { navigate('#/home'); }
    }, [h('span', { 'aria-hidden': 'true', text: '←' }), ' All units']));

    sec.appendChild(h('h1', {}, [
      h('span', { 'aria-hidden': 'true', text: unit.emoji }), ' ' + unit.title
    ]));
    sec.appendChild(h('p', { 'class': 'unit-desc', text: unit.description }));

    if (unitUpcoming(idx) && !unitCompleted(unit)) {
      sec.appendChild(h('div', { 'class': 'friendly-card', text: 'Try earlier units first — or jump in!' }));
    }

    unit.lessons.forEach(function (l) {
      var earned = state.stars[l.id] || 0;
      var row = h('div', { 'class': 'lesson-row' }, [
        h('div', { 'class': 'lesson-info' }, [
          h('div', { 'class': 'lesson-title', text: l.title }),
          starsRow(earned)
        ]),
        h('button', {
          'class': 'btn btn-primary', type: 'button',
          'aria-label': (earned > 0 ? 'Redo lesson: ' : 'Start lesson: ') + l.title,
          onclick: (function (lessonId) { return function () { navigate('#/lesson/' + lessonId); }; })(l.id)
        }, [earned > 0 ? 'Redo' : 'Start'])
      ]);
      sec.appendChild(row);
    });

    setView(sec, '');
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
      'aria-label': 'Exit lesson — progress is saved',
      onclick: function () {
        toast('Saved! See you soon 👋');
        navigate('#/home');
      }
    }, [h('span', { 'aria-hidden': 'true', text: '✕' })]);

    var area = h('div', { 'class': 'exercise-area' });

    sec.appendChild(heading);
    sec.appendChild(h('div', { 'class': 'lesson-topbar' }, [exitBtn, bar]));
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
      // gentle warm wash on the exercise area, 600ms
      s.area.classList.add('warn-flash');
      later(s, function () { s.area.classList.remove('warn-flash'); }, 600);
      // quietly re-queue the same item two exercises later for one retry
      if (!ex.retry && RETRY_TYPES[ex.type]) {
        var props = {};
        Object.keys(ex).forEach(function (k) {
          if (k !== 'type' && k !== 'key' && k !== 'retry') { props[k] = ex[k]; }
        });
        var clone = makeEx(ex.type, props);
        clone.retry = true;
        var at = Math.min(s.idx + 3, s.queue.length);
        s.queue.splice(at, 0, clone);
      }
      // child controls pacing after a miss
      var cont = h('button', {
        'class': 'btn btn-primary',
        type: 'button',
        onclick: function () { advance(s); }
      }, ['Continue']);
      s.area.appendChild(cont);
      s.optionButtons = [];
      cont.focus();
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
    var isExam = mode === 'letters-exam' || mode === 'reading-exam';
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
      } else {
        prev = state.readingExamStars[s.cfg.stepId] || 0;
        state.readingExamStars[s.cfg.stepId] = Math.max(prev, starsEarned);
      }
      save();
      bonus = 20;
      s.xpEarned += bonus;
      addXP(bonus);
      if (mode === 'reading-exam') { earnBadge('first-reader'); }
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

    var continueHash = '#/home';
    if (mode === 'letters-exam') { continueHash = '#/letters'; }
    if (mode === 'reading-exam' || isReadingPractice) { continueHash = '#/reading'; }

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
      if (document.body.contains(finish)) { playPraise(); }
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

  function missTreatment(tapped, correctCard, allButtons, word) {
    tapped.classList.add('anim-shake');
    window.setTimeout(function () {
      tapped.classList.remove('anim-shake');
      tapped.classList.add('state-dim');
    }, 350);
    allButtons.forEach(function (b) { b.disabled = true; });
    markCorrectCard(correctCard);
    playItem(word); // reveal AND speak the right answer
  }

  function renderPickPicture(ex, container, onResult, s) {
    var word = ex.word;
    container.appendChild(h('p', { 'class': 'instruction', text: 'Tap what you hear' }));

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
    if (s) { s.optionButtons = buttons; }
    playWord(word);
  }

  function renderReversePick(ex, container, onResult, s) {
    var word = ex.word;
    container.appendChild(h('p', { 'class': 'instruction', text: 'Pick the Georgian word for:' }));
    container.appendChild(h('div', { 'class': 'prompt-block' }, [
      emojiSpan(word.emoji, word.en, 'prompt-emoji'),
      h('span', { 'class': 'prompt-en', text: word.en })
    ]));

    var distractors = pickDistractors(word, 3, ex.tiers);
    var options = shuffle([word].concat(distractors));
    var list = h('div', { 'class': 'options-list' });
    var buttons = [];
    var selected = -1;
    var judged = false;

    options.forEach(function (opt, i) {
      var btn = h('button', {
        'class': 'word-card',
        type: 'button',
        'aria-pressed': 'false',
        onclick: function () {
          if (judged) { return; }
          playWord(opt); // exploring options out loud is free
          selected = i;
          buttons.forEach(function (b, j) {
            b.setAttribute('aria-pressed', j === i ? 'true' : 'false');
            b.classList.toggle('state-selected', j === i);
          });
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

    var check = h('button', {
      'class': 'btn btn-primary',
      type: 'button',
      onclick: function () {
        if (judged) { return; }
        if (selected === -1) { announce('Pick a word first, then press Check.'); return; }
        judged = true;
        check.disabled = true;
        var chosen = buttons[selected];
        chosen.classList.remove('state-selected');
        var correct = options[selected].id === word.id;
        if (correct) {
          buttons.forEach(function (b) { b.disabled = true; });
          markCorrectCard(chosen);
          onResult({ correct: true, firstTry: true, announce: 'Correct! ' + word.ka + ' — ' + word.en });
        } else {
          var correctBtn = buttons[options.indexOf(word)];
          missTreatment(chosen, correctBtn, buttons, word);
          onResult({ correct: false, firstTry: false, announce: 'Almost! The answer is ' + word.ka + ' — ' + word.en });
        }
      }
    }, ['Check']);
    container.appendChild(check);
    if (s) { s.optionButtons = buttons; }
  }

  function renderMatchPairs(ex, container, onResult, s) {
    var words = ex.words;
    container.appendChild(h('p', { 'class': 'instruction', text: 'Match the pairs' }));

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
  }

  /* renders build_word AND build_syllable — accepts any {id, ka, translit,
   * en?, emoji?}; syllables (no emoji) get "Build what you hear" + auto audio */
  function renderBuildWord(ex, container, onResult, s) {
    var word = ex.word;
    var letters = String(word.ka).split('');
    var hasMeaning = !!word.emoji;
    container.appendChild(h('p', { 'class': 'instruction', text: hasMeaning ? 'Build the word' : 'Build what you hear' }));
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
    if (!hasMeaning) { playWord(word); } // "Build what you hear" — say it up front
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

    function fill() {
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

      dialog.appendChild(h('div', { 'class': 'dialog-letter' }, [kaSpan(letter.ka)]));
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
        onclick: function () { if (current > 0) { current--; fill(); } }
      }, [h('span', { 'aria-hidden': 'true', text: '←' })]));
      nav.appendChild(h('span', { 'class': 'dialog-ipa', text: (current + 1) + ' / ' + ALL_LETTERS.length }));
      nav.appendChild(h('button', {
        'class': 'dialog-arrow',
        type: 'button',
        'aria-label': 'Next letter',
        disabled: current === ALL_LETTERS.length - 1 ? true : null,
        onclick: function () { if (current < ALL_LETTERS.length - 1) { current++; fill(); } }
      }, [h('span', { 'aria-hidden': 'true', text: '→' })]));
      dialog.appendChild(nav);

      var closeBtn = dialog.querySelector('.dialog-close');
      if (closeBtn) { closeBtn.focus(); }
    }

    function close() {
      document.removeEventListener('keydown', onKey, true);
      if (backdrop.parentNode) { backdrop.parentNode.removeChild(backdrop); }
      if (returnFocusEl) { returnFocusEl.focus(); }
    }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowLeft' && current > 0) { e.preventDefault(); current--; fill(); return; }
      if (e.key === 'ArrowRight' && current < ALL_LETTERS.length - 1) { e.preventDefault(); current++; fill(); return; }
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
      'aria-label': 'Tracing area for letter ' + letter.ka +
        ' — draw over the gray letter with your finger or mouse'
    });
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

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
      clear: function () { strokeCount = 0; template(); }
    };
  }

  /* ---------- new exercise renderers ---------- */

  function renderHearPickLetter(ex, container, onResult, s) {
    var letter = ex.letter;
    container.appendChild(h('p', { 'class': 'instruction', text: 'Tap the letter you hear' }));
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
    if (s) { s.optionButtons = buttons; }
    playLetter(letter);
  }

  function renderLetterToSound(ex, container, onResult, s) {
    var item = ex.item; // a letter OR a syllable ({ka, translit, name?})
    var isLetter = !!item.name;
    container.appendChild(h('p', { 'class': 'instruction', text: 'What sound does it make?' }));
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
    if (s) { s.optionButtons = cards; }
  }

  function renderTraceLetter(ex, container, onResult, s) {
    var letter = ex.letter;
    container.appendChild(h('p', { 'class': 'instruction', text: 'Trace the letter' }));
    var tc = makeTraceCanvas(letter);
    container.appendChild(h('div', { 'class': 'trace-card' }, [tc.el]));
    var done = false;
    container.appendChild(h('div', { 'class': 'trace-controls' }, [
      audioBtn(letterAudioId(letter), letter.ka, { label: 'Hear the letter' }),
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
    playLetter(letter);
  }

  function renderReadWordPickPicture(ex, container, onResult, s) {
    var word = ex.word;
    container.appendChild(h('p', { 'class': 'instruction', text: 'Read the word' }));

    var listen = audioBtn(word.id, word.ka, { label: 'Listen — unlocks after you answer' });
    listen.disabled = true;
    listen.classList.add('speak-btn--waiting');
    container.appendChild(h('div', { 'class': 'prompt-block' }, [
      h('span', { 'class': 'prompt-ka' }, [kaSpan(word.ka)]),
      listen
    ]));
    var translitLine = h('p', { 'class': 'translit', text: word.translit });

    var distractors = pickDistractors(word, 3, ex.tiers);
    var options = shuffle([word].concat(distractors));
    var grid = h('div', { 'class': 'options-grid' });
    var buttons = [];
    var answered = false;

    function unlock() {
      listen.disabled = false;
      listen.classList.remove('speak-btn--waiting');
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
    if (s) { s.optionButtons = buttons; }
    // no auto-audio, no translit up front — this one is the reading test
  }

  function renderPicturePickWord(ex, container, onResult, s) {
    var word = ex.word;
    container.appendChild(h('p', { 'class': 'instruction', text: 'Which word says it?' }));
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
    if (s) { s.optionButtons = cards; }
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
        sub: examStars > 0 ? starsRow(examStars) : examQs + ' quick questions',
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
        sub: examStars > 0 ? starsRow(examStars) : examQs + ' quick questions',
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

      deck.appendChild(h('div', { 'class': 'deck-card' }, [
        h('div', { 'class': 'deck-glyph-row' }, [
          h('span', { 'class': 'deck-glyph' }, [kaSpan(letter.ka)]),
          audioBtn(letterAudioId(letter), letter.ka, { label: 'Hear the letter' })
        ]),
        h('div', { 'class': 'dialog-name', text: letter.name + ' · ' + letter.translit }),
        h('div', { 'class': 'dialog-ipa', text: 'sound: /' + letter.ipa + '/' }),
        h('div', { 'class': 'example-row' }, exampleBits),
        h('div', { 'class': 'example-en', text: ex.translit + ' — ' + ex.en })
      ]));

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

  function renderReadingCards(stepId) {
    var step = findReadingStep(stepId);
    if (!step) { renderHome(); return; }
    var items = step.items.map(readItem).filter(function (x) { return !!x; });
    var sec = h('section', { 'class': 'view reading-cards-view', role: 'region', 'aria-label': 'Word cards' });
    sec.appendChild(backLink('Reading', '#/reading'));
    sec.appendChild(h('h1', { text: step.title + ' · Word cards' }));
    var deck = h('div', { 'class': 'deck-area' });
    sec.appendChild(deck);

    var current = 0;

    function finish() {
      var first = pushOnce(state.readingCardsDone, stepId);
      save();
      addXP(first ? 15 : 5);
      playPraise();
      toast('Cards done! 🎉');
      navigate('#/reading');
    }

    /* focusDir ('prev'|'next') — set on user navigation so keyboard focus
     * lands on the new card's matching control instead of dropping to body */
    function show(focusDir) {
      soundToken++; // cancel any running sound-out
      deck.innerHTML = '';
      var item = items[current];
      var chars = String(item.ka).split('');

      var letterBtns = [];
      var wordRow = h('div', { 'class': 'read-word', lang: 'ka' });
      chars.forEach(function (ch) {
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

      var hintLine = h('p', { 'class': 'translit hint-line', tabindex: '-1', text: item.translit + (item.en ? ' — ' + item.en : '') });
      var hintBtn = h('button', {
        'class': 'btn btn-ghost', type: 'button',
        onclick: function () {
          hintBtn.parentNode.replaceChild(hintLine, hintBtn);
          hintLine.focus(); // keep keyboard focus on the revealed hint
        }
      }, ['Show hint']);

      var card = h('div', { 'class': 'deck-card' }, [
        item.emoji
          ? emojiSpan(item.emoji, item.en, 'deck-emoji')
          : emojiSpan('🔤', 'syllable', 'deck-emoji'),
        wordRow,
        h('div', { 'class': 'card-audio-row' }, [
          h('button', {
            'class': 'btn btn-secondary', type: 'button',
            onclick: function () { soundOut(item, letterBtns); }
          }, [h('span', { 'aria-hidden': 'true', text: '🔍 ' }), 'Sound it out']),
          audioBtn(item.id, item.ka, { label: 'Hear the whole word' })
        ]),
        hintBtn
      ]);
      deck.appendChild(card);

      var nav = h('div', { 'class': 'deck-nav' });
      var prevBtn = h('button', {
        'class': 'dialog-arrow', type: 'button',
        'aria-label': 'Previous card',
        disabled: current === 0 ? true : null,
        onclick: function () { if (current > 0) { current--; show('prev'); } }
      }, [h('span', { 'aria-hidden': 'true', text: '←' })]);
      nav.appendChild(prevBtn);
      nav.appendChild(h('span', { 'class': 'dialog-ipa deck-counter', text: (current + 1) + ' / ' + items.length }));
      var fwdBtn;
      if (current < items.length - 1) {
        fwdBtn = h('button', {
          'class': 'dialog-arrow', type: 'button',
          'aria-label': 'Next card',
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
      if (focusDir) {
        (focusDir === 'prev' && !prevBtn.disabled ? prevBtn : fwdBtn).focus();
      }
      announce('Card ' + (current + 1) + ' of ' + items.length + ': ' + item.translit);
    }

    function onKey(e) {
      if (!document.body.contains(sec)) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'ArrowLeft' && current > 0) { e.preventDefault(); current--; show('prev'); }
      else if (e.key === 'ArrowRight' && current < items.length - 1) { e.preventDefault(); current++; show('next'); }
    }
    document.addEventListener('keydown', onKey);

    setView(sec, '');
    show();
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  updateChips();
  route();

})();
