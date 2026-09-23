/*
 * app.js — wires the page to AKMath (js/ak-math.js) and adds the playful bits.
 * Plain ES5-style browser code, no build step, no dependencies.
 */
(function () {
  'use strict';

  var AK = window.AKMath;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var faNumber = new Intl.NumberFormat('fa-IR', { useGrouping: false });

  var CONFETTI_COLORS = ['#FF5FA2', '#FFD60A', '#22B8F0', '#2FC48D', '#7A4DFF', '#FF8A3D', '#E5352B'];
  var MEOWS = ['میو!', 'میااااو~', 'پیتزا بده!', 'پررر…', 'بازم ناز کن', 'میو میو ☀️', 'ماهی؟ 🐟'];

  var COPY_LABEL = 'کپی عدد';
  var REVEAL_MS = 750;   // length of the digit "slot machine" effect
  var DIGITS_MAX_PX = 22;
  var DIGITS_MIN_PX = 5;

  function $(selector) { return document.querySelector(selector); }

  var els = {
    button: $('#ak-button'),
    empty: $('#ak-empty'),
    error: $('#ak-error'),
    result: $('#ak-result'),
    exp: $('#ak-exp'),
    next: $('#ak-next'),
    digits: $('#ak-digits'),
    intCount: $('#ak-int-count'),
    fracCount: $('#ak-frac-count'),
    copy: $('#ak-copy')
  };

  var state = { result: null, runId: 0 };

  /* ------------------------------------------------------------------ cats */

  function mountCats() {
    var template = $('#cat-template');
    if (!template) { return; }
    var hosts = document.querySelectorAll('[data-cat]');
    Array.prototype.forEach.call(hosts, function (host, index) {
      var svg = template.content.firstElementChild.cloneNode(true);
      var data = host.dataset;

      ['fur', 'belly', 'ear', 'stripe', 'iris', 'tip'].forEach(function (key) {
        if (data[key]) { host.style.setProperty('--' + key, data[key]); }
      });
      host.style.setProperty('--stripe-op', data.stripe ? '.75' : '0');
      host.style.setProperty('--pupil-op', data.iris ? '1' : '0');
      // Negative delays so no two cats blink or wag in sync.
      host.style.setProperty('--delay', '-' + ((index * 1.37) % 5).toFixed(2) + 's');

      var slot = host.querySelector('[data-cat-slot]') || host;
      slot.appendChild(svg);
    });
  }

  function initCatCards() {
    var cards = document.querySelectorAll('.cat-card');
    Array.prototype.forEach.call(cards, function (card) {
      var bubble = card.querySelector('.cat-card__bubble');
      var timer = null;
      card.addEventListener('click', function () {
        card.classList.remove('is-hop');
        void card.offsetWidth; // restart the animation
        card.classList.add('is-hop');

        bubble.textContent = MEOWS[Math.floor(Math.random() * MEOWS.length)];
        card.classList.add('is-talking');
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { card.classList.remove('is-talking'); }, 1600);
      });
    });
  }

  /* ------------------------------------------------------------ AK display */

  function renderDigits(result) {
    var box = els.digits;
    box.textContent = '';

    var whole = document.createElement('span');
    whole.className = 'digits__int';
    whole.textContent = result.integer;
    box.appendChild(whole);

    if (result.fraction) {
      var frac = document.createElement('span');
      frac.className = 'digits__frac';
      frac.textContent = '.' + result.fraction;
      box.appendChild(frac);
    }
  }

  /** Largest font size (within limits) at which every digit still fits in the display. */
  function fitDigits() {
    var box = els.digits;
    if (els.result.hidden) { return; }

    var low = DIGITS_MIN_PX;
    var high = DIGITS_MAX_PX;
    box.style.fontSize = high + 'px';
    if (box.scrollHeight <= box.clientHeight + 1) { return; }

    while (high - low > 0.25) {
      var mid = (low + high) / 2;
      box.style.fontSize = mid + 'px';
      if (box.scrollHeight <= box.clientHeight + 1) { low = mid; } else { high = mid; }
    }
    box.style.fontSize = low + 'px';
  }

  /** Digits settle from left to right while the rest still spin. */
  function playReveal(result, runId, onDone) {
    var text = result.text;
    var length = text.length;
    var startedAt = null;

    function frame(now) {
      if (runId !== state.runId) { return; } // a newer press took over
      if (startedAt === null) { startedAt = now; }
      var progress = Math.min(1, (now - startedAt) / REVEAL_MS);
      var settled = Math.floor(progress * length);

      var out = '';
      for (var i = 0; i < length; i += 1) {
        var ch = text.charAt(i);
        out += (i < settled || ch === '.') ? ch : String(Math.floor(Math.random() * 10));
      }
      els.digits.textContent = out;

      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        onDone();
      }
    }
    window.requestAnimationFrame(frame);
  }

  function renderMeta(result) {
    els.exp.textContent = String(result.exponent);
    els.next.textContent = String(result.exponent + 1);
    els.intCount.textContent = faNumber.format(result.integerDigits) + ' رقم صحیح';
    els.fracCount.textContent = faNumber.format(result.fraction.length) + ' رقم اعشار';
  }

  function onCompute() {
    var result;
    try {
      result = AK.computeAK(new Date());
    } catch (error) {
      showError();
      return;
    }

    state.result = result;
    state.runId += 1;
    var runId = state.runId;

    els.empty.hidden = true;
    els.error.hidden = true;
    els.result.hidden = false;

    renderMeta(result);
    renderDigits(result);
    fitDigits();          // size is decided for the final text; the spin keeps the same length
    burstConfetti(els.button);

    if (reduceMotion.matches) { return; }

    els.digits.setAttribute('aria-busy', 'true');
    playReveal(result, runId, function () {
      renderDigits(result);
      els.digits.removeAttribute('aria-busy');
    });
  }

  function showError() {
    els.empty.hidden = true;
    els.result.hidden = true;
    els.error.hidden = false;
  }

  /* ------------------------------------------------------------------ copy */

  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (error) { ok = false; }
      document.body.removeChild(area);
      if (ok) { resolve(); } else { reject(new Error('copy failed')); }
    });
  }

  /** Clipboard API first; falls back to the legacy path if it is missing or refused. */
  function copyText(text) {
    var viaApi = (navigator.clipboard && window.isSecureContext)
      ? navigator.clipboard.writeText(text)
      : Promise.reject(new Error('clipboard API unavailable'));
    return viaApi.catch(function () { return legacyCopy(text); });
  }

  function onCopy() {
    if (!state.result) { return; }
    copyText(state.result.text).then(function () {
      els.copy.textContent = 'کپی شد ✓';
    }, function () {
      els.copy.textContent = 'کپی نشد';
    }).then(function () {
      window.setTimeout(function () { els.copy.textContent = COPY_LABEL; }, 1600);
    });
  }

  /* -------------------------------------------------------------- confetti */

  function burstConfetti(origin) {
    if (reduceMotion.matches || !origin.animate) { return; }

    var rect = origin.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    for (var i = 0; i < 44; i += 1) {
      var piece = document.createElement('div');
      var w = 8 + Math.random() * 6;
      var h = 10 + Math.random() * 8;
      piece.className = 'confetti';
      piece.style.width = w + 'px';
      piece.style.height = h + 'px';
      piece.style.left = cx - w / 2 + 'px';
      piece.style.top = cy - h / 2 + 'px';
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.borderRadius = Math.random() < 0.4 ? '50%' : '3px';
      document.body.appendChild(piece);

      var angle = Math.random() * Math.PI * 2;
      var spread = 90 + Math.random() * 190;
      var dx = Math.cos(angle) * spread;
      var rise = Math.sin(angle) * spread * 0.6 - 60;
      var fall = rise + 160 + Math.random() * 140;
      var spin = (Math.random() - 0.5) * 900;

      var animation = piece.animate([
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + dx * 0.7 + 'px, ' + rise + 'px) rotate(' + spin * 0.5 + 'deg)', opacity: 1, offset: 0.45 },
        { transform: 'translate(' + dx + 'px, ' + fall + 'px) rotate(' + spin + 'deg)', opacity: 0 }
      ], { duration: 950 + Math.random() * 650, easing: 'cubic-bezier(.2, .7, .4, 1)', fill: 'forwards' });

      animation.onfinish = (function (node) {
        return function () { node.remove(); };
      }(piece));
    }
  }

  /* ---------------------------------------------------------------- footer */

  function fillRule() {
    var target = $('[data-rule]');
    if (!target) { return; }
    var start = AK.START_DATE;
    var date = new Date(start.year, start.month - 1, start.day);
    var label;
    try {
      label = date.toLocaleDateString('fa-IR-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (error) {
      label = start.year + '-' + start.month + '-' + start.day;
    }
    target.textContent = 'n در ' + label + ' برابر ' + faNumber.format(AK.START_EXPONENT) + ' بود و هر روز یکی بیشتر می‌شه.';
  }

  /* ------------------------------------------------------------------ init */

  function init() {
    mountCats();
    initCatCards();

    if (!AK || typeof BigInt === 'undefined') {
      els.button.addEventListener('click', showError);
      return;
    }

    fillRule();
    els.button.addEventListener('click', onCompute);
    els.copy.addEventListener('click', onCopy);

    var resizeFrame = null;
    window.addEventListener('resize', function () {
      if (resizeFrame) { return; }
      resizeFrame = window.requestAnimationFrame(function () {
        resizeFrame = null;
        fitDigits();
      });
    });
  }

  init();
}());
