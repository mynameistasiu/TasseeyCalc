(() => {
  'use strict';

  const state = {
    mode: 'standard',
    expression: '',
    memory: 0,
    history: loadJSON('tasseey_history', []),
    degMode: loadJSON('tasseey_deg_mode', 'DEG'),
    precision: loadJSON('tasseey_precision', 8),
    lastAnswer: loadJSON('tasseey_last_answer', 0)
  };

  const dom = {
    modes: Array.from(document.querySelectorAll('.mode')),
    controlsArea: document.getElementById('controlsArea'),
    display: document.getElementById('display'),
    expression: document.getElementById('expression'),
    history: document.getElementById('history'),
    historyToggle: document.getElementById('historyToggle'),
    themeToggle: document.getElementById('themeToggle'),
    mClear: document.getElementById('mClear'),
    mRecall: document.getElementById('mRecall'),
    mPlus: document.getElementById('mPlus'),
    mMinus: document.getElementById('mMinus')
  };

  if (!dom.controlsArea || !dom.display || !dom.expression) {
    return;
  }

  init();

  function init() {
    bindModeSwitch();
    bindTopActions();
    bindKeyboard();
    renderMode(state.mode);
    renderHistory();
    setExpression(state.expression);
    setDisplay(state.expression || '0');
  }

  function bindModeSwitch() {
    dom.modes.forEach((btn) => {
      btn.addEventListener('click', () => {
        dom.modes.forEach((m) => m.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode || 'standard';
        renderMode(state.mode);
      });
    });
  }

  function bindTopActions() {
    if (dom.historyToggle) {
      dom.historyToggle.addEventListener('click', () => {
        dom.history.classList.toggle('hidden');
      });
    }

    if (dom.themeToggle) {
      dom.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        dom.themeToggle.textContent = document.body.classList.contains('dark') ? 'Light' : 'Dark';
      });
    }

    dom.mClear?.addEventListener('click', () => {
      state.memory = 0;
      notify('Memory cleared');
    });

    dom.mRecall?.addEventListener('click', () => {
      appendToken(formatNumber(state.memory));
    });

    dom.mPlus?.addEventListener('click', () => {
      const v = Number(parseDisplayValue());
      state.memory += Number.isFinite(v) ? v : 0;
      notify('Added to memory');
    });

    dom.mMinus?.addEventListener('click', () => {
      const v = Number(parseDisplayValue());
      state.memory -= Number.isFinite(v) ? v : 0;
      notify('Subtracted from memory');
    });
  }

  function bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        appendToken(e.key);
      } else if (/^[+\-*/().]$/.test(e.key)) {
        appendToken(e.key);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        evaluateCurrent();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === '%') {
        appendToken('%');
      }
    });
  }

  function renderMode(mode) {
    dom.controlsArea.innerHTML = '';

    if (mode === 'standard') {
      renderButtonGrid([
        ['C', 'DEL', '%', '/'],
        ['7', '8', '9', '*'],
        ['4', '5', '6', '-'],
        ['1', '2', '3', '+'],
        ['+/-', '0', '.', '=']
      ]);
      return;
    }

    if (mode === 'scientific') {
      renderButtonGrid([
        ['sin', 'cos', 'tan', 'PI'],
        ['ln', 'log', 'sqrt', '^'],
        ['x2', 'x3', '(', ')'],
        ['!', 'abs', 'Ans', 'DEL'],
        ['7', '8', '9', '/'],
        ['4', '5', '6', '*'],
        ['1', '2', '3', '-'],
        ['+/-', '0', '.', '+'],
        ['C', '%', 'RAD/DEG', '=']
      ]);
      return;
    }

    if (mode === 'date') {
      renderDateTools();
      return;
    }

    if (mode === 'data') {
      renderDataTools();
      return;
    }

    renderSettings();
  }

  function renderButtonGrid(rows) {
    rows.flat().forEach((label) => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = label;

      if (/^[+\-*/=]$/.test(label) || label === '%') {
        btn.classList.add('op');
      } else if (['C', 'DEL', 'sin', 'cos', 'tan', 'ln', 'log', 'sqrt', '^', 'x2', 'x3', '!', 'abs', 'Ans', 'RAD/DEG', '+/-'].includes(label)) {
        btn.classList.add('fun');
      }

      btn.addEventListener('click', () => handleButton(label));
      dom.controlsArea.appendChild(btn);
    });
  }

  function renderDateTools() {
    const box = document.createElement('div');
    box.className = 'span-4';
    box.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <label>From: <input id="dateFrom" type="date"></label>
          <label>To: <input id="dateTo" type="date"></label>
          <label>Days: <input id="dayOffset" type="number" value="0" style="width:90px"></label>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" id="dateDiff">Difference</button>
          <button class="btn" id="dateAdd">Add Days</button>
          <button class="btn" id="dateSub">Subtract Days</button>
          <button class="btn" id="dateAge">Age</button>
          <button class="btn" id="dateWeekday">Weekday</button>
        </div>
        <div id="dateOut" style="font-size:14px;color:#334155"></div>
      </div>
    `;
    dom.controlsArea.appendChild(box);

    const from = box.querySelector('#dateFrom');
    const to = box.querySelector('#dateTo');
    const offset = box.querySelector('#dayOffset');
    const out = box.querySelector('#dateOut');

    box.querySelector('#dateDiff').addEventListener('click', () => {
      if (!from.value || !to.value) {
        setDisplay('Select both dates');
        return;
      }
      const diff = dateDiffDays(from.value, to.value);
      const text = `${diff} day(s)`;
      out.textContent = text;
      setDisplay(text);
      pushHistory(`Date diff ${from.value} -> ${to.value}`, text);
    });

    box.querySelector('#dateAdd').addEventListener('click', () => {
      if (!from.value) {
        setDisplay('Pick a date');
        return;
      }
      const n = Number(offset.value || 0);
      const res = addDays(from.value, n);
      out.textContent = res;
      setDisplay(res);
      pushHistory(`${from.value} + ${n} day(s)`, res);
    });

    box.querySelector('#dateSub').addEventListener('click', () => {
      if (!from.value) {
        setDisplay('Pick a date');
        return;
      }
      const n = Number(offset.value || 0);
      const res = addDays(from.value, -n);
      out.textContent = res;
      setDisplay(res);
      pushHistory(`${from.value} - ${n} day(s)`, res);
    });

    box.querySelector('#dateAge').addEventListener('click', () => {
      if (!from.value) {
        setDisplay('Pick DOB');
        return;
      }
      const age = ageFromDate(from.value);
      const text = `${age.years}y ${age.months}m ${age.days}d`;
      out.textContent = text;
      setDisplay(text);
      pushHistory(`Age for ${from.value}`, text);
    });

    box.querySelector('#dateWeekday').addEventListener('click', () => {
      if (!from.value) {
        setDisplay('Pick a date');
        return;
      }
      const day = new Date(from.value + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long' });
      out.textContent = day;
      setDisplay(day);
      pushHistory(`Weekday of ${from.value}`, day);
    });
  }

  function renderDataTools() {
    const box = document.createElement('div');
    box.className = 'span-4';
    box.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <textarea id="dataInput" placeholder="Enter numbers separated by comma, space, or newline" style="min-height:110px;padding:10px;border:1px solid #e2e8f0;border-radius:8px"></textarea>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" id="statsRun">Calculate Stats</button>
          <button class="btn" id="statsClear">Clear</button>
        </div>
        <pre id="statsOut" style="margin:0;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;white-space:pre-wrap"></pre>
      </div>
    `;
    dom.controlsArea.appendChild(box);

    const input = box.querySelector('#dataInput');
    const out = box.querySelector('#statsOut');

    box.querySelector('#statsRun').addEventListener('click', () => {
      const nums = parseNumberList(input.value);
      if (!nums.length) {
        setDisplay('No numbers');
        return;
      }
      const s = calcStats(nums);
      const text = [
        `count: ${s.count}`,
        `sum: ${formatNumber(s.sum)}`,
        `min: ${formatNumber(s.min)}`,
        `max: ${formatNumber(s.max)}`,
        `range: ${formatNumber(s.range)}`,
        `mean: ${formatNumber(s.mean)}`,
        `median: ${formatNumber(s.median)}`,
        `mode: ${s.mode}`,
        `variance: ${formatNumber(s.variance)}`,
        `std dev: ${formatNumber(s.sd)}`
      ].join('\n');
      out.textContent = text;
      setDisplay(`mean ${formatNumber(s.mean)}`);
      pushHistory(`Data stats (${s.count} values)`, `mean ${formatNumber(s.mean)}`);
    });

    box.querySelector('#statsClear').addEventListener('click', () => {
      input.value = '';
      out.textContent = '';
      setDisplay('0');
    });
  }

  function renderSettings() {
    const box = document.createElement('div');
    box.className = 'span-4';
    box.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;padding:4px">
        <label>Angle mode:
          <select id="setAngle">
            <option value="DEG">Degrees</option>
            <option value="RAD">Radians</option>
          </select>
        </label>
        <label>Precision (0-12):
          <input id="setPrecision" type="number" min="0" max="12" value="${Number(state.precision) || 8}">
        </label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" id="setSave">Save Settings</button>
          <button class="btn" id="setClearHistory">Clear History</button>
          <button class="btn" id="setReset">Reset Expression</button>
        </div>
      </div>
    `;
    dom.controlsArea.appendChild(box);

    const angle = box.querySelector('#setAngle');
    const precision = box.querySelector('#setPrecision');
    angle.value = state.degMode;

    box.querySelector('#setSave').addEventListener('click', () => {
      state.degMode = angle.value;
      const p = Math.max(0, Math.min(12, Number(precision.value || 8)));
      state.precision = Number.isFinite(p) ? p : 8;
      saveJSON('tasseey_deg_mode', state.degMode);
      saveJSON('tasseey_precision', state.precision);
      setDisplay(`Saved ${state.degMode}, p=${state.precision}`);
    });

    box.querySelector('#setClearHistory').addEventListener('click', () => {
      state.history = [];
      saveJSON('tasseey_history', state.history);
      renderHistory();
      setDisplay('History cleared');
    });

    box.querySelector('#setReset').addEventListener('click', () => {
      state.expression = '';
      setExpression('');
      setDisplay('0');
    });
  }

  function handleButton(label) {
    if (label === 'RAD/DEG') {
      state.degMode = state.degMode === 'DEG' ? 'RAD' : 'DEG';
      saveJSON('tasseey_deg_mode', state.degMode);
      setDisplay(`Angle ${state.degMode}`);
      return;
    }

    if (label === 'C') {
      state.expression = '';
      setExpression('');
      setDisplay('0');
      return;
    }

    if (label === 'DEL') {
      backspace();
      return;
    }

    if (label === '=') {
      evaluateCurrent();
      return;
    }

    if (label === '+/-') {
      toggleSign();
      return;
    }

    if (label === 'x2') {
      appendToken('^2');
      return;
    }

    if (label === 'x3') {
      appendToken('^3');
      return;
    }

    if (label === 'PI') {
      appendToken('PI');
      return;
    }

    if (label === 'Ans') {
      appendToken(String(state.lastAnswer));
      return;
    }

    if (label === 'sin' || label === 'cos' || label === 'tan' || label === 'log' || label === 'ln' || label === 'sqrt' || label === 'abs') {
      appendToken(`${label}(`);
      return;
    }

    appendToken(label);
  }

  function appendToken(token) {
    state.expression += token;
    setExpression(state.expression);
    setDisplay(state.expression || '0');
  }

  function backspace() {
    state.expression = state.expression.slice(0, -1);
    setExpression(state.expression);
    setDisplay(state.expression || '0');
  }

  function toggleSign() {
    if (!state.expression) {
      state.expression = '-';
      setExpression(state.expression);
      setDisplay(state.expression);
      return;
    }

    const m = state.expression.match(/(-?\d*\.?\d+)$/);
    if (!m) {
      state.expression += '-';
    } else {
      const n = m[1];
      const flipped = n.startsWith('-') ? n.slice(1) : '-' + n;
      state.expression = state.expression.slice(0, -n.length) + flipped;
    }

    setExpression(state.expression);
    setDisplay(state.expression || '0');
  }

  function evaluateCurrent() {
    if (!state.expression.trim()) {
      return;
    }

    try {
      const value = evaluateExpression(state.expression);
      if (!Number.isFinite(value)) {
        throw new Error('Invalid result');
      }
      const shown = formatNumber(value);
      pushHistory(state.expression, shown);
      state.lastAnswer = value;
      saveJSON('tasseey_last_answer', value);
      state.expression = shown;
      setExpression(shown);
      setDisplay(shown);
    } catch (_err) {
      setDisplay('Error');
    }
  }

  function evaluateExpression(expr) {
    const raw = expr
      .replace(/\u00d7/g, '*')
      .replace(/\u00f7/g, '/')
      .replace(/PI/g, String(Math.PI));

    const withPercent = raw.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    const withFactorial = withPercent.replace(/(\d+(?:\.\d+)?|\([^()]+\))!/g, '__fact($1)');

    const transformed = withFactorial
      .replace(/\^/g, '**')
      .replace(/\blog\(/g, '__log10(')
      .replace(/\bln\(/g, 'Math.log(')
      .replace(/\bsqrt\(/g, 'Math.sqrt(')
      .replace(/\bsin\(/g, '__sin(')
      .replace(/\bcos\(/g, '__cos(')
      .replace(/\btan\(/g, '__tan(')
      .replace(/\babs\(/g, 'Math.abs(');

    if (!/^[0-9+\-*/().,%\sA-Za-z_]*$/.test(transformed)) {
      throw new Error('Unsafe expression');
    }

    const helpers = {
      __log10: (x) => (Math.log10 ? Math.log10(x) : Math.log(x) / Math.LN10),
      __sin: (x) => Math.sin(toRadians(Number(x))),
      __cos: (x) => Math.cos(toRadians(Number(x))),
      __tan: (x) => Math.tan(toRadians(Number(x))),
      __fact: (x) => factorial(Number(x))
    };

    const fn = new Function(
      '__helpers',
      `with (__helpers) { return (${transformed}); }`
    );

    return Number(fn(helpers));
  }

  function toRadians(x) {
    return state.degMode === 'DEG' ? (x * Math.PI) / 180 : x;
  }

  function factorial(n) {
    if (!Number.isFinite(n) || n < 0 || Math.floor(n) !== n) {
      return NaN;
    }
    if (n === 0 || n === 1) {
      return 1;
    }
    let out = 1;
    for (let i = 2; i <= n; i += 1) {
      out *= i;
    }
    return out;
  }

  function parseNumberList(text) {
    return text
      .split(/[\s,]+/)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));
  }

  function calcStats(nums) {
    const sorted = nums.slice().sort((a, b) => a - b);
    const count = nums.length;
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const range = max - min;
    const median =
      count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[(count - 1) / 2];

    const freq = {};
    let mode = sorted[0];
    let best = 0;
    nums.forEach((n) => {
      const k = String(n);
      freq[k] = (freq[k] || 0) + 1;
      if (freq[k] > best) {
        best = freq[k];
        mode = n;
      }
    });

    const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / count;
    const sd = Math.sqrt(variance);

    return { count, sum, min, max, range, mean, median, mode, variance, sd };
  }

  function dateDiffDays(fromISO, toISO) {
    const from = new Date(fromISO + 'T00:00:00');
    const to = new Date(toISO + 'T00:00:00');
    return Math.round((to - from) / 86400000);
  }

  function addDays(iso, days) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
  }

  function ageFromDate(dobISO) {
    const dob = new Date(dobISO + 'T00:00:00');
    const now = new Date();

    let years = now.getFullYear() - dob.getFullYear();
    let months = now.getMonth() - dob.getMonth();
    let days = now.getDate() - dob.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonthDays;
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    return { years, months, days };
  }

  function pushHistory(expr, res) {
    state.history.unshift({ expr, res, at: new Date().toISOString() });
    state.history = state.history.slice(0, 100);
    saveJSON('tasseey_history', state.history);
    renderHistory();
  }

  function renderHistory() {
    if (!dom.history) {
      return;
    }

    if (!state.history.length) {
      dom.history.innerHTML = '<div class="muted">No history yet</div>';
      return;
    }

    dom.history.innerHTML = state.history
      .map((item, i) => {
        const expr = escapeHtml(item.expr);
        const res = escapeHtml(item.res);
        return `<div class="hist-item" data-idx="${i}" style="padding:8px;border-bottom:1px solid #e2e8f0;cursor:pointer"><div style="font-size:12px;color:#64748b">${expr}</div><div style="font-weight:700">${res}</div></div>`;
      })
      .join('');

    dom.history.querySelectorAll('.hist-item').forEach((el) => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.idx);
        const row = state.history[idx];
        if (!row) {
          return;
        }
        state.expression = row.expr;
        setExpression(state.expression);
        setDisplay(row.res);
      });
    });
  }

  function parseDisplayValue() {
    return String(dom.display.textContent || '').replace(/[^0-9+\-.eE]/g, '');
  }

  function setDisplay(v) {
    dom.display.textContent = String(v);
  }

  function setExpression(v) {
    dom.expression.textContent = String(v || '');
  }

  function formatNumber(n) {
    const p = Math.max(0, Math.min(12, Number(state.precision) || 8));
    if (!Number.isFinite(n)) {
      return String(n);
    }
    return Number(n.toFixed(p)).toString();
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch (_err) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function notify(msg) {
    console.log(msg);
  }
})();
