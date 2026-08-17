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
      practiceSessions: 0   // completed practice sessions (practicer badge)
    };
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

  function speakBtn(text, label) {
    return h('button', {
      'class': 'speak-btn',
      type: 'button',
      'aria-label': label || 'Play audio',
      onclick: function () { speak(text); }
    }, [h('span', { 'aria-hidden': 'true', text: '🔊' })]);
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
    'practicer':         { emoji: '🏃', name: 'Practicer' }
  };

  function totalStars() {
    var t = state.practiceStars || 0;
    Object.keys(state.stars).forEach(function (k) { t += state.stars[k] || 0; });
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

  function entryCard(emoji, kaLabel, enLabel, hash, ariaLabel) {
    return h('button', {
      'class': 'entry-card',
      type: 'button',
      'aria-label': ariaLabel,
      onclick: function () { navigate(hash); }
    }, [
      h('span', { 'class': 'entry-emoji', 'aria-hidden': 'true', text: emoji }),
      h('span', {}, [
        kaSpan(kaLabel), ' · ' + enLabel,
        h('span', { 'class': 'entry-sub', text: hash === '#/alphabet' ? ALL_LETTERS.length + ' letters, one sound each' : 'Mix everything you know' })
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

    sec.appendChild(entryCard('🔤', C.strings.alphabet, 'Alphabet', '#/alphabet', 'Open the Georgian alphabet'));
    sec.appendChild(entryCard('🧠', C.strings.practice, 'Review', '#/practice', 'Practice everything you have learned'));

    var path = h('ol', { 'class': 'home-path' });
    C.units.forEach(function (u, i) {
      var done = lessonsDone(u);
      var total = u.lessons.length;
      var completed = unitCompleted(u) || state.crowns.indexOf(u.id) !== -1;
      var upcoming = !completed && unitUpcoming(i);
      var crowned = state.crowns.indexOf(u.id) !== -1;

      var bubble = h('button', {
        'class': 'unit-bubble' + (completed ? ' completed' : '') + (upcoming ? ' upcoming' : ''),
        type: 'button',
        'aria-label': 'Unit: ' + u.title + ', ' + done + ' of ' + total + ' lessons complete' + (crowned ? ', crowned' : ''),
        onclick: (function (unitId) { return function () { navigate('#/unit/' + unitId); }; })(u.id)
      });
      bubble.insertAdjacentHTML('beforeend', ringSvg(total ? done / total : 0, completed));
      bubble.appendChild(h('span', { 'class': 'bubble-face', 'aria-hidden': 'true', text: u.emoji }));
      if (crowned) {
        bubble.appendChild(h('span', { 'class': 'unit-crown', 'aria-hidden': 'true', text: '👑' }));
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
    words.forEach(function (w) { state.lastPracticed[w.id] = now; });

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
      if (!ex.retry && (ex.type === 'pick_picture' || ex.type === 'reverse_pick')) {
        var clone = makeEx(ex.type, { word: ex.word, tiers: ex.tiers });
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
    var isPractice = s.cfg.mode === 'practice';
    var starsEarned;

    if (isPractice) {
      state.practiceStars++;
      state.practiceSessions++;
      save();
      starsEarned = 1;
      if (state.practiceSessions >= 5) { earnBadge('practicer'); }
    } else {
      var acc = s.totalOriginal ? s.score / s.totalOriginal : 1;
      starsEarned = acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : 1; // finishing always earns at least one star
      var prev = state.stars[s.cfg.lessonId] || 0;
      state.stars[s.cfg.lessonId] = Math.max(prev, starsEarned);
      save();
      var bonus = 20;
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

    var slots = h('div', { 'class': 'star-slots', 'aria-label': isPractice
      ? 'Practice star earned'
      : starsEarned + ' of 3 stars earned' });
    var slotCount = isPractice ? 1 : 3;
    for (var i = 0; i < slotCount; i++) {
      slots.appendChild(h('span', {
        'class': 'star-slot' + (i < starsEarned ? ' filled' : ''),
        'aria-hidden': 'true',
        text: '★'
      }));
    }
    finish.appendChild(slots);
    if (isPractice) {
      finish.appendChild(h('p', { 'class': 'finish-note', text: 'Practice star!' }));
    }
    finish.appendChild(h('p', { 'class': 'xp-line', text: '+' + s.xpEarned + ' XP' }));

    var actions = h('div', { 'class': 'finish-actions' });
    actions.appendChild(h('button', {
      'class': 'btn btn-primary btn-block', type: 'button',
      onclick: function () { navigate('#/home'); }
    }, ['Continue']));
    actions.appendChild(h('button', {
      'class': 'btn btn-secondary btn-block', type: 'button',
      onclick: function () {
        if (isPractice) { startPracticeSession(); }
        else { renderLessonRoute(s.cfg.lessonId); }
      }
    }, [isPractice ? 'Practice again' : 'Redo lesson']));
    finish.appendChild(actions);

    s.area.innerHTML = '';
    s.area.appendChild(finish);
    s.fill.style.width = '100%';
    s.bar.setAttribute('aria-valuenow', '100');
    confettiBurst(finish);
    announce('Excellent! ' + (isPractice
      ? 'Practice complete. You earned a practice star and ' + s.xpEarned + ' XP.'
      : 'Lesson complete. You earned ' + starsEarned + (starsEarned === 1 ? ' star' : ' stars') + ' and ' + s.xpEarned + ' XP.'));
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
    speak(word.ka);
  }

  function renderPickPicture(ex, container, onResult, s) {
    var word = ex.word;
    var withVoice = hasVoice();
    container.appendChild(h('p', { 'class': 'instruction', text: withVoice ? 'Tap what you hear' : 'Tap the matching picture' }));

    var prompt = h('div', { 'class': 'prompt-block' }, [
      h('span', { 'class': 'prompt-ka' }, [kaSpan(word.ka)]),
      speakBtn(word.ka, 'Hear the word again')
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
    speak(word.ka);
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
          speak(opt.ka); // exploring options out loud is free
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
      list.appendChild(btn);
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
        speak(btn._word.ka);
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

  function renderBuildWord(ex, container, onResult, s) {
    var word = ex.word;
    var letters = String(word.ka).split('');
    container.appendChild(h('p', { 'class': 'instruction', text: 'Build the word' }));
    container.appendChild(h('div', { 'class': 'prompt-block' }, [
      emojiSpan(word.emoji, word.en, 'prompt-emoji'),
      h('span', { 'class': 'prompt-en', text: word.en })
    ]));
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
          announce: 'You built it! ' + word.ka + ' — ' + word.en
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
  }

  var RENDERERS = {
    pick_picture: renderPickPicture,
    reverse_pick: renderReversePick,
    match_pairs: renderMatchPairs,
    build_word: renderBuildWord
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
        grid.appendChild(tile);
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

  function openLetterDialog(index, returnFocusEl) {
    var backdrop = h('div', { 'class': 'modal-backdrop' });
    var dialog = h('div', { 'class': 'letter-dialog', role: 'dialog', 'aria-modal': 'true' });
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    var current = index;

    function recordOpened(letter) {
      if (state.letterCardsOpened.indexOf(letter.ka) === -1) {
        state.letterCardsOpened.push(letter.ka);
        save();
        if (state.letterCardsOpened.length >= 10) { earnBadge('alphabet-explorer'); }
      }
    }

    function fill() {
      var letter = ALL_LETTERS[current];
      recordOpened(letter);
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
      dialog.appendChild(h('div', {}, exampleBits));
      dialog.appendChild(h('div', { 'class': 'example-en', text: ex.translit + ' — ' + ex.en }));
      dialog.appendChild(sayHint(letter.translit));

      if (hasVoice()) {
        dialog.appendChild(h('button', {
          'class': 'btn btn-primary',
          type: 'button',
          onclick: function () {
            speak(letter.ka);
            window.setTimeout(function () { speak(ex.ka); }, 900);
          }
        }, ['🔊 Hear it']));
      }

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

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  updateChips();
  route();

})();
