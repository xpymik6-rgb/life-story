/* Логика игры «Истории твоей жизни».
   Два кубика: 10 граней — категория, 20 граней — вопрос.
   Вопросы не повторяются; пропущенные возвращаются в конце круга. */

(function () {
  'use strict';

  var CATS = 10, QS = 20, TOTAL = CATS * QS;
  var STORE = 'lsg-state';

  // ---------- Тексты интерфейса ----------
  var T = {
    ru: {
      title: 'Истории твоей жизни',
      of: 'из',
      dieCat: 'категория',
      dieQ: 'вопрос',
      hint: 'Нажми, чтобы бросить кубики',
      hintManual: 'Назови два числа',
      show: 'Показать',
      seen: 'этот вопрос уже выпадал',
      doneBig: 'Все 200 вопросов рассказаны',
      doneSub: 'Колода пуста. Можно начать круг заново.',
      reset: 'Начать заново',
      skip: 'Пропустить',
      roll: 'Бросить',
      next: 'Дальше',
      modeManual: 'Свои числа',
      modeDice: 'Кубики',
      badNums: 'Категория 1–10, вопрос 1–20',
      resetAsk: 'Забыть все открытые вопросы и начать заново?'
    },
    en: {
      title: 'The Life Story Game',
      of: 'of',
      dieCat: 'category',
      dieQ: 'question',
      hint: 'Tap to roll the dice',
      hintManual: 'Name two numbers',
      show: 'Show',
      seen: 'this question has come up before',
      doneBig: 'All 200 stories are told',
      doneSub: 'The deck is empty. You can start a new round.',
      reset: 'Start over',
      skip: 'Skip',
      roll: 'Roll',
      next: 'Next',
      modeManual: 'Own numbers',
      modeDice: 'Dice',
      badNums: 'Category 1–10, question 1–20',
      resetAsk: 'Forget every opened question and start over?'
    },
    es: {
      title: 'Historias de tu vida',
      of: 'de',
      dieCat: 'categoría',
      dieQ: 'pregunta',
      hint: 'Toca para lanzar los dados',
      hintManual: 'Digan dos números',
      show: 'Mostrar',
      seen: 'esta pregunta ya salió antes',
      doneBig: 'Las 200 historias están contadas',
      doneSub: 'El mazo está vacío. Pueden empezar otra ronda.',
      reset: 'Empezar de nuevo',
      skip: 'Saltar',
      roll: 'Lanzar',
      next: 'Siguiente',
      modeManual: 'Sus números',
      modeDice: 'Dados',
      badNums: 'Categoría 1–10, pregunta 1–20',
      resetAsk: '¿Olvidar todas las preguntas abiertas y empezar de nuevo?'
    },
    pt: {
      title: 'Histórias da sua vida',
      of: 'de',
      dieCat: 'categoria',
      dieQ: 'pergunta',
      hint: 'Toque para rolar os dados',
      hintManual: 'Digam dois números',
      show: 'Mostrar',
      seen: 'esta pergunta já saiu antes',
      doneBig: 'As 200 histórias foram contadas',
      doneSub: 'O baralho acabou. Podem começar de novo.',
      reset: 'Começar de novo',
      skip: 'Pular',
      roll: 'Rolar',
      next: 'Próxima',
      modeManual: 'Números de vocês',
      modeDice: 'Dados',
      badNums: 'Categoria 1–10, pergunta 1–20',
      resetAsk: 'Esquecer todas as perguntas abertas e começar de novo?'
    }
  };

  // ---------- Состояние ----------
  var state = {
    lang: 'ru',
    mode: 'dice',      // dice | manual
    used: [],          // отвеченные пары "c:q"
    skipped: [],       // пропущенные — вернутся, когда колода опустеет
    current: null      // {c, q, seen}
  };

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (T[s.lang]) state.lang = s.lang;
      if (Array.isArray(s.used)) state.used = s.used;
      if (Array.isArray(s.skipped)) state.skipped = s.skipped;
    } catch (e) { /* испорченное сохранение просто игнорируем */ }
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        lang: state.lang, used: state.used, skipped: state.skipped
      }));
    } catch (e) { /* приватный режим браузера — играем без сохранения */ }
  }

  // ---------- Элементы ----------
  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage'), dice = $('dice'), card = $('card'), done = $('done');
  var numCat = $('num-cat'), numQ = $('num-q');
  var promptBox = $('prompt'), hint = promptBox.querySelector('.prompt__hint'), manual = $('manual');
  var btnRoll = $('roll'), btnSkip = $('skip'), btnMode = $('mode'), btnReset = $('reset');
  var inCat = $('in-cat'), inQ = $('in-q');

  var rolling = false;

  // ---------- Вспомогательное ----------
  function key(c, q) { return c + ':' + q; }
  function t(k) { return T[state.lang][k]; }

  // Свободные пары: сначала нетронутые, а когда они кончились — отложенные
  function pool() {
    var busy = {}, i;
    for (i = 0; i < state.used.length; i++) busy[state.used[i]] = 1;
    for (i = 0; i < state.skipped.length; i++) busy[state.skipped[i]] = 1;

    var free = [];
    for (var c = 1; c <= CATS; c++) {
      for (var q = 1; q <= QS; q++) {
        if (!busy[key(c, q)]) free.push([c, q]);
      }
    }
    if (free.length) return free;

    // Нетронутых нет — возвращаем в игру пропущенные
    var back = state.skipped.map(function (k) {
      var p = k.split(':');
      return [+p[0], +p[1]];
    });
    state.skipped = [];
    return back;
  }

  function rnd(n) { return Math.floor(Math.random() * n); }

  // ---------- Отрисовка ----------
  function applyLang() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (T[state.lang][k]) el.textContent = T[state.lang][k];
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-title');
      if (T[state.lang][k]) { el.title = T[state.lang][k]; el.setAttribute('aria-label', T[state.lang][k]); }
    });
    document.querySelectorAll('.lang__opt').forEach(function (el) {
      el.classList.toggle('is-on', el.getAttribute('data-lang') === state.lang);
    });
    hint.textContent = state.mode === 'dice' ? t('hint') : t('hintManual');
    btnMode.textContent = state.mode === 'dice' ? t('modeManual') : t('modeDice');
    btnRoll.textContent = state.current ? t('next') : t('roll');
    document.title = t('title');
    if (state.current) drawCard();
  }

  function drawCard() {
    var c = state.current.c, q = state.current.q;
    var cat = CATEGORIES[c - 1];
    var item = cat.questions[q - 1];
    $('card-cat').textContent = cat[state.lang];
    $('card-nums').textContent = c + ' · ' + q;
    $('card-q').textContent = item[state.lang];
    $('card-seen').hidden = !state.current.seen;
    $('card-seen').textContent = t('seen');
  }

  function updateCount() {
    $('count').textContent = state.used.length;
  }

  function showCard(c, q, seen) {
    state.current = { c: c, q: q, seen: !!seen };
    numCat.textContent = c;
    numQ.textContent = q;
    done.hidden = true;
    card.hidden = false;
    // перезапуск анимации выкладывания карты
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';
    document.body.classList.add('has-card');
    btnSkip.hidden = false;
    btnRoll.textContent = t('next');
    drawCard();
  }

  function showDone() {
    state.current = null;
    card.hidden = true;
    done.hidden = false;
    btnSkip.hidden = true;
    document.body.classList.remove('has-card');
    btnRoll.textContent = t('roll');
  }

  // ---------- Бросок ----------
  function roll() {
    if (rolling) return;

    // Открытый вопрос считается отвеченным, когда бросают следующий раз
    if (state.current && !state.current.seen) {
      var k = key(state.current.c, state.current.q);
      if (state.used.indexOf(k) === -1) state.used.push(k);
    }

    var free = pool();
    if (!free.length) { updateCount(); save(); showDone(); return; }

    var pick = free[rnd(free.length)];
    rolling = true;
    document.body.classList.add('is-rolling');
    card.hidden = true;
    done.hidden = true;
    btnSkip.hidden = true;
    document.body.classList.remove('has-card');

    // Цифры мелькают, пока кубики «катятся»
    var tick = setInterval(function () {
      numCat.textContent = 1 + rnd(CATS);
      numQ.textContent = 1 + rnd(QS);
    }, 70);

    setTimeout(function () {
      clearInterval(tick);
      document.body.classList.remove('is-rolling');
      rolling = false;
      updateCount();
      save();
      showCard(pick[0], pick[1], false);
    }, 850);
  }

  function skip() {
    if (!state.current || rolling) return;
    var k = key(state.current.c, state.current.q);
    // Пропущенный не засчитывается, но вернётся только в конце круга
    if (state.used.indexOf(k) === -1 && state.skipped.indexOf(k) === -1) state.skipped.push(k);
    state.current = null;
    save();
    roll();
  }

  function reset() {
    if (!confirm(t('resetAsk'))) return;
    state.used = [];
    state.skipped = [];
    state.current = null;
    save();
    card.hidden = true;
    done.hidden = true;
    btnSkip.hidden = true;
    document.body.classList.remove('has-card');
    numCat.textContent = CATS;
    numQ.textContent = QS;
    btnRoll.textContent = t('roll');
    updateCount();
  }

  function setMode(m) {
    state.mode = m;
    manual.hidden = m !== 'manual';
    hint.hidden = m === 'manual';
    btnRoll.hidden = m === 'manual';
    hint.textContent = m === 'dice' ? t('hint') : t('hintManual');
    btnMode.textContent = m === 'dice' ? t('modeManual') : t('modeDice');
  }

  // ---------- События ----------
  btnRoll.addEventListener('click', roll);
  btnSkip.addEventListener('click', skip);
  btnReset.addEventListener('click', reset);
  $('done-reset').addEventListener('click', function () {
    state.used = []; state.skipped = []; state.current = null;
    save(); updateCount(); done.hidden = true; btnRoll.textContent = t('roll');
  });

  btnMode.addEventListener('click', function () {
    setMode(state.mode === 'dice' ? 'manual' : 'dice');
  });

  $('lang').addEventListener('click', function (e) {
    var btn = e.target.closest('.lang__opt');
    if (!btn) return;
    var code = btn.getAttribute('data-lang');
    if (!T[code] || code === state.lang) return;
    state.lang = code;
    save();
    applyLang();
  });

  // Тап по кубикам или по пустому месту сцены — тоже бросок
  dice.addEventListener('click', function (e) { e.preventDefault(); if (state.mode === 'dice') roll(); });
  stage.addEventListener('click', function (e) {
    if (state.mode !== 'dice') return;
    if (e.target.closest('.card, .done, .manual')) return;
    roll();
  });

  manual.addEventListener('submit', function (e) {
    e.preventDefault();
    var c = parseInt(inCat.value, 10), q = parseInt(inQ.value, 10);
    if (!(c >= 1 && c <= CATS) || !(q >= 1 && q <= QS)) { alert(t('badNums')); return; }
    var k = key(c, q);
    var seen = state.used.indexOf(k) !== -1;
    if (!seen && state.used.indexOf(k) === -1) state.used.push(k);
    var si = state.skipped.indexOf(k);
    if (si !== -1) state.skipped.splice(si, 1);
    updateCount();
    save();
    showCard(c, q, seen);
    inCat.value = ''; inQ.value = '';
  });

  // ---------- Старт ----------
  load();
  setMode('dice');
  applyLang();
  updateCount();
  numCat.textContent = CATS;
  numQ.textContent = QS;
})();
