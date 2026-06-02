/* ═══════════════════════════════════════════════
   LearnBuddy — Math, Science & Language Workspace JS
═══════════════════════════════════════════════ */

// ── HOME NAVIGATION ──────────────────────────
function goHome() {
  document.querySelectorAll('.workspace').forEach(w => w.style.display = 'none');
  document.getElementById('home-screen').style.display = '';
  document.getElementById('home-btn').style.display = 'none';
  document.getElementById('page-tagline').textContent = 'Smart Learning Platform';
  loadHomeStats();
  // Clear hash without triggering hashchange
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

function openSubject(name) {
  document.getElementById('home-screen').style.display = 'none';
  document.querySelectorAll('.workspace').forEach(w => w.style.display = 'none');
  const ws = document.getElementById('workspace-' + name);
  if (ws) ws.style.display = '';
  document.getElementById('home-btn').style.display = '';
  // Update URL hash (allows back button, Ctrl+click, bookmark)
  if (window.location.hash !== '#' + name) {
    history.replaceState(null, '', '#' + name);
  }
  const titles = {
    lesson: '📖 Lesson Viewer', math: '➗ Mathematics',
    science: '🔬 Science', language: '🌍 Languages', notebook: '📒 My Notebook'
  };
  document.getElementById('page-tagline').textContent = titles[name] || 'LearnBuddy';
  if (name === 'math')     { mathTab('calc'); }
  if (name === 'science')  { sciTab('periodic'); buildPeriodicTable(); }
  if (name === 'language') { langTab('trans'); }
  if (name === 'notebook') { renderNotebookStandalone(); }
}

function loadHomeStats() {
  const words = getWords();
  document.getElementById('stat-words').textContent    = words.length;
  document.getElementById('stat-mastered').textContent = words.filter(w => w.mastered).length;
  getCacheSize().then(n => {
    document.getElementById('stat-cached').textContent = n.toLocaleString();
  });
  // Greeting
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('home-greeting').textContent = g + '! 👋';
}

// ── CALCULATOR ───────────────────────────────
let calcVal = '0', calcPrev = '', calcOp = '', calcNewNum = true;
const calcHistory = [];

function calcAction(v) {
  const disp = document.getElementById('calc-display');
  if (v === 'clear') { calcVal = '0'; calcPrev = ''; calcOp = ''; calcNewNum = true; }
  else if (v === 'sign') { calcVal = String(-parseFloat(calcVal)); }
  else if (v === '%') { calcVal = String(parseFloat(calcVal) / 100); }
  else if (['+','-','*','/'].includes(v)) {
    calcPrev = calcVal; calcOp = v; calcNewNum = true;
  }
  else if (v === '=') {
    if (!calcOp || !calcPrev) return;
    const a = parseFloat(calcPrev), b = parseFloat(calcVal);
    let result;
    if (calcOp === '+') result = a + b;
    else if (calcOp === '-') result = a - b;
    else if (calcOp === '*') result = a * b;
    else if (calcOp === '/') result = b !== 0 ? a / b : 'Error';
    const expr = calcPrev + ' ' + {'+':'+','-':'−','*':'×','/':'÷'}[calcOp] + ' ' + calcVal + ' = ' + result;
    calcHistory.unshift(expr);
    if (calcHistory.length > 5) calcHistory.pop();
    document.getElementById('calc-history').innerHTML = calcHistory
      .map(h => '<div class="calc-history-item">' + h + '</div>').join('');
    calcVal = String(result); calcOp = ''; calcPrev = ''; calcNewNum = true;
  }
  else if (v === '.') {
    if (calcNewNum) { calcVal = '0.'; calcNewNum = false; }
    else if (!calcVal.includes('.')) calcVal += '.';
  }
  else {
    if (calcNewNum) { calcVal = v; calcNewNum = false; }
    else calcVal = calcVal === '0' ? v : calcVal + v;
  }
  disp.textContent = calcVal.length > 12 ? parseFloat(calcVal).toPrecision(10) : calcVal;
}

// Keyboard support for calculator
document.addEventListener('keydown', e => {
  const ws = document.getElementById('workspace-math');
  if (!ws || ws.style.display === 'none') return;
  const mathCalc = document.getElementById('math-calc');
  if (!mathCalc || mathCalc.style.display === 'none') return;
  if ('0123456789'.includes(e.key)) calcAction(e.key);
  else if (e.key === '+') calcAction('+');
  else if (e.key === '-') calcAction('-');
  else if (e.key === '*') calcAction('*');
  else if (e.key === '/') { e.preventDefault(); calcAction('/'); }
  else if (e.key === 'Enter' || e.key === '=') calcAction('=');
  else if (e.key === 'Escape') calcAction('clear');
  else if (e.key === '.') calcAction('.');
  else if (e.key === 'Backspace') {
    if (calcVal.length > 1) calcVal = calcVal.slice(0,-1);
    else calcVal = '0';
    document.getElementById('calc-display').textContent = calcVal;
  }
});

// ── TIMES TABLES ─────────────────────────────
let ttNum = 2, ttScore = 0, ttTotal = 0, ttCorrect = 0;

function mathTab(tab) {
  ['calc','tables','geometry','convert','solve'].forEach(t => {
    document.getElementById('math-' + t).style.display = t === tab ? '' : 'none';
    const btn = document.getElementById('math-nav-' + (t === 'tables' ? 'tables' : t === 'geometry' ? 'geometry' : t === 'convert' ? 'convert' : t === 'solve' ? 'solve' : 'calc'));
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'tables') renderTimesTable(ttNum);
  if (tab === 'convert') { setConvType(document.querySelector('.conv-tab'), 'length'); }
  if (tab === 'solve') {}
}

function renderTimesTable(n) {
  ttNum = n;
  // Build number selector buttons
  const btnContainer = document.getElementById('table-btns');
  if (btnContainer && !btnContainer.children.length) {
    for (let i = 1; i <= 20; i++) {
      const b = document.createElement('button');
      b.className = 'sc-tag'; b.style.cursor = 'pointer'; b.style.padding = '5px 10px';
      b.textContent = i + '×';
      b.onclick = () => { ttNum = i; renderTimesTable(i); };
      btnContainer.appendChild(b);
    }
  }
  // Highlight active
  if (btnContainer) {
    Array.from(btnContainer.children).forEach((b, i) => {
      b.style.background = (i + 1) === n ? 'var(--blue)' : '';
      b.style.color = (i + 1) === n ? 'white' : '';
      b.style.borderColor = (i + 1) === n ? 'var(--blue)' : '';
    });
  }
  const grid = document.getElementById('times-table-grid');
  let html = '';
  for (let i = 1; i <= 12; i++) {
    html += '<div class="tt-cell"><span style="color:var(--text-m)">' + n + ' × ' + i + '</span><br>'
      + '<span style="font-size:18px;font-weight:900;color:var(--blue-d)">' + (n * i) + '</span></div>';
  }
  grid.innerHTML = html;
  nextTTQuestion();
}

function nextTTQuestion() {
  const a = ttNum, b = Math.floor(Math.random() * 12) + 1;
  document.getElementById('tt-quiz-q').textContent = a + ' × ' + b + ' = ?';
  document.getElementById('tt-quiz-q').dataset.answer = a * b;
  document.getElementById('tt-answer').value = '';
  document.getElementById('tt-feedback').textContent = '';
  document.getElementById('tt-answer').focus();
}

function checkTTAnswer() {
  const input = document.getElementById('tt-answer');
  const correct = parseInt(document.getElementById('tt-quiz-q').dataset.answer);
  const given   = parseInt(input.value);
  const fb      = document.getElementById('tt-feedback');
  ttTotal++;
  document.getElementById('tt-total').textContent = ttTotal;
  if (given === correct) {
    ttScore++; fb.textContent = '✅ Correct! Well done!'; fb.style.color = 'var(--green)';
    document.getElementById('tt-score').textContent = ttScore;
    setTimeout(nextTTQuestion, 1000);
  } else {
    fb.textContent = '❌ Not quite — the answer is ' + correct; fb.style.color = 'var(--rose)';
  }
}

// ── GEOMETRY ─────────────────────────────────
function calcGeo(shape) {
  const pi = Math.PI;
  const fmt = n => Math.round(n * 100) / 100;
  let html = '';
  if (shape === 'rect') {
    const l = parseFloat(document.getElementById('rect-l').value);
    const w = parseFloat(document.getElementById('rect-w').value);
    if (isNaN(l) || isNaN(w)) { showGeoResult('rect-result', '⚠️ Enter both values'); return; }
    html = '📐 Area = ' + fmt(l * w) + ' sq units<br>📏 Perimeter = ' + fmt(2 * (l + w)) + ' units';
  } else if (shape === 'tri') {
    const b = parseFloat(document.getElementById('tri-b').value);
    const h = parseFloat(document.getElementById('tri-h').value);
    const a = parseFloat(document.getElementById('tri-a').value);
    const c = parseFloat(document.getElementById('tri-c').value);
    if (isNaN(b) || isNaN(h)) { showGeoResult('tri-result', '⚠️ Enter at least base and height'); return; }
    html = '📐 Area = ' + fmt(0.5 * b * h) + ' sq units';
    if (!isNaN(a) && !isNaN(c)) html += '<br>📏 Perimeter = ' + fmt(b + a + c) + ' units';
  } else if (shape === 'circle') {
    const r = parseFloat(document.getElementById('cir-r').value);
    if (isNaN(r)) { showGeoResult('circle-result', '⚠️ Enter the radius'); return; }
    html = '📐 Area = ' + fmt(pi * r * r) + ' sq units<br>⭕ Circumference = ' + fmt(2 * pi * r) + ' units';
  } else if (shape === 'para') {
    const b = parseFloat(document.getElementById('par-b').value);
    const h = parseFloat(document.getElementById('par-h').value);
    const s = parseFloat(document.getElementById('par-s').value);
    if (isNaN(b) || isNaN(h)) { showGeoResult('para-result', '⚠️ Enter base and height'); return; }
    html = '📐 Area = ' + fmt(b * h) + ' sq units';
    if (!isNaN(s)) html += '<br>📏 Perimeter = ' + fmt(2 * (b + s)) + ' units';
  }
  showGeoResult(shape === 'para' ? 'para-result' : shape + '-result', html);
}
function showGeoResult(id, html) {
  const el = document.getElementById(id);
  el.innerHTML = html; el.style.display = 'block';
}

// ── UNIT CONVERTER ───────────────────────────
const CONV_UNITS = {
  length: {
    units: ['mm','cm','m','km','inch','foot','yard','mile'],
    toBase: { mm:0.001, cm:0.01, m:1, km:1000, inch:0.0254, foot:0.3048, yard:0.9144, mile:1609.34 }
  },
  weight: {
    units: ['mg','g','kg','tonne','oz','lb','stone'],
    toBase: { mg:0.000001, g:0.001, kg:1, tonne:1000, oz:0.028349, lb:0.453592, stone:6.35029 }
  },
  temp: { units: ['°C','°F','K'], toBase: {} },
  area: {
    units: ['mm²','cm²','m²','km²','inch²','foot²','acre','hectare'],
    toBase: { 'mm²':0.000001,'cm²':0.0001,'m²':1,'km²':1000000,'inch²':0.000645,'foot²':0.0929,'acre':4046.86,'hectare':10000 }
  },
  volume: {
    units: ['ml','L','m³','tsp','tbsp','cup','pint','gallon'],
    toBase: { ml:0.001, L:1, 'm³':1000, tsp:0.00492, tbsp:0.01479, cup:0.236588, pint:0.473176, gallon:3.78541 }
  },
  time: {
    units: ['sec','min','hour','day','week','month','year'],
    toBase: { sec:1, min:60, hour:3600, day:86400, week:604800, month:2629800, year:31557600 }
  }
};
let convType = 'length';

function setConvType(btn, type) {
  convType = type;
  document.querySelectorAll('.conv-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const units = CONV_UNITS[type].units;
  const fromSel = document.getElementById('conv-from');
  const toSel   = document.getElementById('conv-to');
  fromSel.innerHTML = units.map(u => '<option>' + u + '</option>').join('');
  toSel.innerHTML   = units.map((u, i) => '<option' + (i === 1 ? ' selected' : '') + '>' + u + '</option>').join('');
  document.getElementById('conv-input').value = '';
  document.getElementById('conv-result').textContent = '';
  document.getElementById('conv-all').innerHTML = '';
}

function doConvert() {
  const val  = parseFloat(document.getElementById('conv-input').value);
  if (isNaN(val)) { document.getElementById('conv-result').textContent = ''; return; }
  const from = document.getElementById('conv-from').value;
  const to   = document.getElementById('conv-to').value;
  const fmt  = n => n < 0.001 ? n.toExponential(3) : (Math.round(n * 1000000) / 1000000).toLocaleString();

  let result;
  if (convType === 'temp') {
    if      (from === '°C' && to === '°F') result = val * 9/5 + 32;
    else if (from === '°C' && to === 'K')  result = val + 273.15;
    else if (from === '°F' && to === '°C') result = (val - 32) * 5/9;
    else if (from === '°F' && to === 'K')  result = (val - 32) * 5/9 + 273.15;
    else if (from === 'K'  && to === '°C') result = val - 273.15;
    else if (from === 'K'  && to === '°F') result = (val - 273.15) * 9/5 + 32;
    else result = val;
    document.getElementById('conv-result').textContent = val + ' ' + from + ' = ' + fmt(result) + ' ' + to;
    document.getElementById('conv-all').innerHTML = '';
  } else {
    const tb = CONV_UNITS[convType].toBase;
    const base = val * tb[from];
    result = base / tb[to];
    document.getElementById('conv-result').textContent = val + ' ' + from + ' = ' + fmt(result) + ' ' + to;
    // Show all conversions
    let rows = CONV_UNITS[convType].units.map(u => {
      const v = u === from ? val : base / tb[u];
      return '<div class="conv-row"><span class="conv-row-unit">' + u + '</span><span class="conv-row-val">' + fmt(v) + '</span></div>';
    }).join('');
    document.getElementById('conv-all').innerHTML = rows;
  }
}

// ── AI MATH SOLVER ───────────────────────────
async function solveMath() {
  const problem = document.getElementById('math-problem').value.trim();
  if (!problem) return;
  if (!getKey()) { alert('Please paste your Gemini API key in the header first.'); return; }
  document.getElementById('math-solve-result').style.display = 'none';
  document.getElementById('math-solve-loading').style.display = '';
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + getKey(),
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents: [{ parts: [{ text:
          'You are a friendly math tutor for children aged 8-14. Solve this problem step by step:\n"' + problem + '"\n\nReturn ONLY valid JSON, no markdown:\n{"title":"Problem name","steps":["Step 1: ...","Step 2: ...","Step 3: ..."],"answer":"Final answer","tip":"One helpful tip or shortcut"}' }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 700 } }) }
    );
    const data = await res.json();
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    raw = raw.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s >= 0 && e > s) raw = raw.slice(s, e+1);
    const d = JSON.parse(raw);
    const stepsHtml = (d.steps || []).map((step, i) =>
      '<div class="step"><div class="step-num">' + (i+1) + '</div><div>' + step + '</div></div>'
    ).join('');
    document.getElementById('math-solution-body').innerHTML =
      '<h3>🔢 ' + (d.title || problem) + '</h3>' + stepsHtml +
      '<div style="margin-top:10px;padding:10px 14px;background:var(--green-l);border-radius:var(--r-sm);font-weight:800;color:#15803d;font-size:15px;">✅ Answer: ' + (d.answer || '') + '</div>' +
      (d.tip ? '<div style="margin-top:10px;padding:10px 14px;background:var(--amber-l);border-radius:var(--r-sm);font-size:13px;color:#92400e;"><strong>💡 Tip:</strong> ' + d.tip + '</div>' : '');
    document.getElementById('math-solve-loading').style.display = 'none';
    document.getElementById('math-solve-result').style.display = '';
  } catch(e) {
    document.getElementById('math-solve-loading').style.display = 'none';
    document.getElementById('math-solution-body').textContent = '❌ Could not solve. Check your API key and try again.';
    document.getElementById('math-solve-result').style.display = '';
  }
}
function tryExample(btn) {
  document.getElementById('math-problem').value = btn.textContent;
  solveMath();
}

// ── PERIODIC TABLE ────────────────────────────
const ELEMENTS = [
  {n:1,sym:'H',name:'Hydrogen',cat:'nonmetal',col:1,row:1},{n:2,sym:'He',name:'Helium',cat:'noble',col:18,row:1},
  {n:3,sym:'Li',name:'Lithium',cat:'alkali',col:1,row:2},{n:4,sym:'Be',name:'Beryllium',cat:'alkaline',col:2,row:2},
  {n:5,sym:'B',name:'Boron',cat:'metalloid',col:13,row:2},{n:6,sym:'C',name:'Carbon',cat:'nonmetal',col:14,row:2},
  {n:7,sym:'N',name:'Nitrogen',cat:'nonmetal',col:15,row:2},{n:8,sym:'O',name:'Oxygen',cat:'nonmetal',col:16,row:2},
  {n:9,sym:'F',name:'Fluorine',cat:'halogen',col:17,row:2},{n:10,sym:'Ne',name:'Neon',cat:'noble',col:18,row:2},
  {n:11,sym:'Na',name:'Sodium',cat:'alkali',col:1,row:3},{n:12,sym:'Mg',name:'Magnesium',cat:'alkaline',col:2,row:3},
  {n:13,sym:'Al',name:'Aluminium',cat:'post',col:13,row:3},{n:14,sym:'Si',name:'Silicon',cat:'metalloid',col:14,row:3},
  {n:15,sym:'P',name:'Phosphorus',cat:'nonmetal',col:15,row:3},{n:16,sym:'S',name:'Sulfur',cat:'nonmetal',col:16,row:3},
  {n:17,sym:'Cl',name:'Chlorine',cat:'halogen',col:17,row:3},{n:18,sym:'Ar',name:'Argon',cat:'noble',col:18,row:3},
  {n:19,sym:'K',name:'Potassium',cat:'alkali',col:1,row:4},{n:20,sym:'Ca',name:'Calcium',cat:'alkaline',col:2,row:4},
  {n:21,sym:'Sc',name:'Scandium',cat:'transition',col:3,row:4},{n:22,sym:'Ti',name:'Titanium',cat:'transition',col:4,row:4},
  {n:23,sym:'V',name:'Vanadium',cat:'transition',col:5,row:4},{n:24,sym:'Cr',name:'Chromium',cat:'transition',col:6,row:4},
  {n:25,sym:'Mn',name:'Manganese',cat:'transition',col:7,row:4},{n:26,sym:'Fe',name:'Iron',cat:'transition',col:8,row:4},
  {n:27,sym:'Co',name:'Cobalt',cat:'transition',col:9,row:4},{n:28,sym:'Ni',name:'Nickel',cat:'transition',col:10,row:4},
  {n:29,sym:'Cu',name:'Copper',cat:'transition',col:11,row:4},{n:30,sym:'Zn',name:'Zinc',cat:'transition',col:12,row:4},
  {n:31,sym:'Ga',name:'Gallium',cat:'post',col:13,row:4},{n:32,sym:'Ge',name:'Germanium',cat:'metalloid',col:14,row:4},
  {n:33,sym:'As',name:'Arsenic',cat:'metalloid',col:15,row:4},{n:34,sym:'Se',name:'Selenium',cat:'nonmetal',col:16,row:4},
  {n:35,sym:'Br',name:'Bromine',cat:'halogen',col:17,row:4},{n:36,sym:'Kr',name:'Krypton',cat:'noble',col:18,row:4},
  {n:37,sym:'Rb',name:'Rubidium',cat:'alkali',col:1,row:5},{n:38,sym:'Sr',name:'Strontium',cat:'alkaline',col:2,row:5},
  {n:47,sym:'Ag',name:'Silver',cat:'transition',col:11,row:5},{n:48,sym:'Cd',name:'Cadmium',cat:'transition',col:12,row:5},
  {n:49,sym:'In',name:'Indium',cat:'post',col:13,row:5},{n:50,sym:'Sn',name:'Tin',cat:'post',col:14,row:5},
  {n:51,sym:'Sb',name:'Antimony',cat:'metalloid',col:15,row:5},{n:52,sym:'Te',name:'Tellurium',cat:'metalloid',col:16,row:5},
  {n:53,sym:'I',name:'Iodine',cat:'halogen',col:17,row:5},{n:54,sym:'Xe',name:'Xenon',cat:'noble',col:18,row:5},
  {n:55,sym:'Cs',name:'Caesium',cat:'alkali',col:1,row:6},{n:56,sym:'Ba',name:'Barium',cat:'alkaline',col:2,row:6},
  {n:79,sym:'Au',name:'Gold',cat:'transition',col:11,row:6},{n:80,sym:'Hg',name:'Mercury',cat:'transition',col:12,row:6},
  {n:81,sym:'Tl',name:'Thallium',cat:'post',col:13,row:6},{n:82,sym:'Pb',name:'Lead',cat:'post',col:14,row:6},
  {n:83,sym:'Bi',name:'Bismuth',cat:'post',col:15,row:6},{n:86,sym:'Rn',name:'Radon',cat:'noble',col:18,row:6},
  {n:87,sym:'Fr',name:'Francium',cat:'alkali',col:1,row:7},{n:88,sym:'Ra',name:'Radium',cat:'alkaline',col:2,row:7},
  {n:92,sym:'U',name:'Uranium',cat:'actinide',col:6,row:10},{n:94,sym:'Pu',name:'Plutonium',cat:'actinide',col:8,row:10}
];
const EL_FACTS = {
  H:'The lightest element. Makes up 75% of all matter in the universe. Used in rocket fuel.',
  He:'Used in party balloons. Second most abundant element in the universe.',
  Li:'Used in batteries for phones and electric cars. Very light metal.',
  C:'Found in all living things. Diamonds and graphite are both pure carbon.',
  N:'Makes up 78% of the air we breathe. Essential for plant growth.',
  O:'Makes up 21% of air. Essential for breathing and burning.',
  Fe:'The most common element in Earth by mass. Makes up the Earth\'s core.',
  Au:'Soft, shiny yellow metal. Used in jewellery and electronics.',
  Ag:'Best conductor of electricity. Used in coins and jewellery.',
  Cu:'Used in electrical wires. Turns green when it reacts with air.',
  Na:'A soft metal that reacts violently with water. Found in table salt.',
  Cl:'A yellow-green gas used to disinfect swimming pools.',
  Ca:'Found in bones and teeth. Milk is a good source of calcium.',
  Mg:'Burns with an intensely bright white flame. Found in chlorophyll.',
  Si:'The most common element in Earth\'s crust. Used in computer chips.',
  P:'Essential for DNA and cell energy. Used in matches and fertilisers.',
  S:'Used in making rubber and medicines. Burns with a blue flame.',
  K:'Essential for plant growth. Your heart needs potassium to beat properly.',
  I:'Essential for thyroid function. Added to table salt in many countries.',
  U:'Radioactive element used in nuclear power plants.'
};

function buildPeriodicTable() {
  const cont = document.getElementById('periodic-table-container');
  if (cont.innerHTML) return; // already built
  const grid = document.createElement('div');
  grid.className = 'periodic-table';
  const cells = {};
  ELEMENTS.forEach(el => { cells[el.row + '-' + el.col] = el; });
  for (let row = 1; row <= 7; row++) {
    for (let col = 1; col <= 18; col++) {
      const el = cells[row + '-' + col];
      const cell = document.createElement('div');
      if (el) {
        cell.className = 'el-cell el-' + el.cat;
        cell.title = el.name + ' (' + el.n + ')';
        cell.innerHTML = '<div class="el-num">' + el.n + '</div><div class="el-sym">' + el.sym + '</div><div class="el-name">' + el.name.slice(0,6) + '</div>';
        cell.onclick = () => showElement(el);
      } else {
        cell.style.visibility = 'hidden';
      }
      grid.appendChild(cell);
    }
  }
  cont.appendChild(grid);
}

function showElement(el) {
  const detail = document.getElementById('element-detail');
  const fact = EL_FACTS[el.sym] || 'A ' + el.cat + ' element with atomic number ' + el.n + '.';
  const catColors = { alkali:'#fde68a',alkaline:'#fed7aa',transition:'#fca5a5',post:'#d9f99d',metalloid:'#a7f3d0',nonmetal:'#bae6fd',halogen:'#c4b5fd',noble:'#fbcfe8' };
  detail.style.display = '';
  detail.innerHTML =
    '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">' +
    '<div style="width:70px;height:70px;border-radius:12px;background:' + (catColors[el.cat]||'#e5e7eb') + ';display:flex;flex-direction:column;align-items:center;justify-content:center;border:2px solid rgba(0,0,0,.1);">' +
    '<div style="font-size:10px;font-weight:700;opacity:.7">' + el.n + '</div>' +
    '<div style="font-size:26px;font-weight:900">' + el.sym + '</div>' +
    '</div>' +
    '<div><div style="font-size:22px;font-weight:900;color:var(--text-h)">' + el.name + '</div>' +
    '<div style="font-size:13px;font-weight:700;color:var(--text-m);text-transform:capitalize">' + el.cat.replace('-',' ') + ' · Atomic number: ' + el.n + '</div></div></div>' +
    '<div style="margin-top:12px;font-size:14px;font-weight:500;color:var(--text-b);line-height:1.7;padding:12px 14px;background:var(--bg-page);border-radius:var(--r-sm);">💡 ' + fact + '</div>' +
    '<div style="margin-top:10px;display:flex;gap:8px;">' +
    '<a href="https://www.google.com/search?q=' + el.name + '+element" target="_blank" class="dict-ext-btn dict-ext-g" style="text-decoration:none">🔍 Google</a>' +
    '<a href="https://en.wikipedia.org/wiki/' + el.name + '" target="_blank" class="dict-ext-btn" style="text-decoration:none;border-color:#aaa">📖 Wikipedia</a></div>';
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── SCIENCE AI ────────────────────────────────
async function explainBodySystem(system) {
  if (!getKey()) { alert('Please paste your Gemini API key in the header first.'); return; }
  const result = document.getElementById('body-result');
  result.innerHTML = '<div class="loader" style="margin:0 auto;"></div>';
  result.style.display = '';
  const res = await callSciAI('Explain the ' + system + ' to a child aged 10 in simple, fun language. Include what it does, key parts, and one amazing fact.');
  result.innerHTML = '<h3 style="font-size:16px;font-weight:900;color:var(--text-h);margin-bottom:8px;">🫀 ' + system.split(' - ')[0] + '</h3><div style="font-size:14px;line-height:1.75;color:var(--text-b)">' + res + '</div>';
}

async function askScience() {
  const q = document.getElementById('sci-question').value.trim();
  if (!q) return;
  if (!getKey()) { alert('Please paste your Gemini API key in the header first.'); return; }
  document.getElementById('sci-loading').style.display = '';
  document.getElementById('sci-result').style.display = 'none';
  const res = await callSciAI(q + '\n\nExplain this science topic to a child aged 10-14 in simple, fun language with an analogy or real-life example.');
  document.getElementById('sci-answer-body').innerHTML = '<div style="font-size:14px;line-height:1.75;color:var(--text-b)">' + res + '</div>';
  document.getElementById('sci-loading').style.display = 'none';
  document.getElementById('sci-result').style.display = '';
}

async function callSciAI(prompt) {
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + getKey(),
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{parts:[{text: prompt}]}], generationConfig:{temperature:0.7,maxOutputTokens:600} }) }
    );
    const data = await res.json();
    return (data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response').replace(/\n/g,'<br>');
  } catch { return '❌ Could not connect. Check your API key.'; }
}

function askSciExample(btn) {
  document.getElementById('sci-question').value = btn.textContent;
  askScience();
}

function sciTab(tab) {
  ['periodic','body','explain'].forEach(t => {
    document.getElementById('sci-' + t).style.display = t === tab ? '' : 'none';
    const btn = document.getElementById('sci-nav-' + (t === 'periodic' ? 'periodic' : t === 'body' ? 'body' : 'explain'));
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

// ── LANGUAGE WORKSPACE ────────────────────────
let langTargetLang = 'ta';

function langTab(tab) {
  ['trans','dict','pronoun'].forEach(t => {
    document.getElementById('lang-' + t).style.display = t === tab ? '' : 'none';
    const btn = document.getElementById('lang-nav-' + (t === 'trans' ? 'trans' : t === 'dict' ? 'dict' : 'pronoun'));
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

function langSetLang(btn) {
  langTargetLang = btn.dataset.lang;
  document.querySelectorAll('#lang-lang-btns .tr-lang-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  langUpdateLinks();
}

function langUpdateLinks() {
  const text = document.getElementById('lang-trans-input')?.value || '';
  const enc  = encodeURIComponent(text);
  const gtBtn = document.getElementById('lang-gt-btn');
  if (gtBtn) gtBtn.href = 'https://translate.google.com/?sl=auto&tl=' + langTargetLang + '&text=' + enc + '&op=translate';
  const dlBtn = document.getElementById('lang-deepl-btn');
  if (dlBtn) dlBtn.href = 'https://www.deepl.com/translator#auto/' + langTargetLang + '/' + enc;
}

async function langLookup() {
  const word = document.getElementById('lang-dict-input').value.trim();
  if (!word) return;
  document.getElementById('lang-dict-loading').style.display = '';
  document.getElementById('lang-dict-result').innerHTML = '';
  // Reuse main lookupDictionary but render into lang panel
  const loading = document.getElementById('lang-dict-loading');
  const results = document.getElementById('lang-dict-result');
  loading.style.display = 'flex';
  results.innerHTML = '';
  // Call same engine
  await lookupDictionary(word);
  // After lookup, copy result from main dict panel to lang dict
  loading.style.display = 'none';
  const mainResult = document.getElementById('dict-results');
  if (mainResult && mainResult.innerHTML) {
    results.innerHTML = mainResult.innerHTML;
  }
}

function speakPronoun() {
  const word = document.getElementById('pronoun-input').value.trim();
  if (!word) return;
  const speed = parseFloat(document.getElementById('pronoun-speed').value) || 0.8;
  document.getElementById('pronoun-speed-lbl').textContent = speed + '×';
  if (!window.speechSynthesis) { document.getElementById('pronoun-status').textContent = '⚠️ Speech not supported in this browser'; return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.rate = speed; u.pitch = 1; u.lang = 'en-US';
  u.onstart = () => { document.getElementById('pronoun-status').textContent = '🔊 Speaking: "' + word + '"…'; };
  u.onend   = () => { document.getElementById('pronoun-status').textContent = '✅ Done! Try again or pick another word.'; };
  speechSynthesis.speak(u);
}

// Speed slider live update
document.addEventListener('DOMContentLoaded', () => {
  const sl = document.getElementById('pronoun-speed');
  if (sl) sl.addEventListener('input', () => {
    document.getElementById('pronoun-speed-lbl').textContent = sl.value + '×';
  });
  loadHomeStats();
});

// ── STANDALONE NOTEBOOK ───────────────────────
function renderNotebookStandalone() {
  const words    = getWords();
  const mastered = words.filter(w => w.mastered).length;
  const el1 = document.getElementById('nb-cnt2');
  const el2 = document.getElementById('nb-mastered2');
  if (el1) el1.textContent = words.length;
  if (el2) el2.textContent = mastered;
  const grid = document.getElementById('nb-grid2');
  if (!grid) return;
  if (!words.length) { grid.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-l);font-weight:700">No words saved yet. Go to Lesson Viewer and save some words!</div>'; return; }
  grid.innerHTML = words.map(e => {
    const safeW = e.word.replace(/"/g,'&quot;');
    return '<div class="wd-card' + (e.mastered?' mastered':'') + '" data-word="' + safeW + '">' +
      '<div class="wd-top"><div class="wd-word">' + e.word + '</div>' +
      '<button class="wd-star-btn' + (e.mastered?' on':'') + '" onclick="toggleMastered(this.closest(\'[data-word]\').dataset.word);renderNotebookStandalone()">' + (e.mastered?'⭐':'☆') + '</button>' +
      '<button class="wd-del-btn" onclick="deleteWord(this.closest(\'[data-word]\').dataset.word);renderNotebookStandalone()">✕</button></div>' +
      (e.pronunciation?'<div class="wd-pronoun">'+e.pronunciation+'</div>':'') +
      (e.meaning?'<div class="wd-meaning">'+e.meaning+'</div>':'') +
      (e.example?'<div class="wd-example">"'+e.example+'"</div>':'') +
      '</div>';
  }).join('');
}

// ── HASH ROUTER ──────────────────────────────
// Enables Ctrl+click / right-click → open in new tab
// and browser back/forward navigation
const VALID_SUBJECTS = ['lesson','math','science','language','notebook'];

function handleHashRoute() {
  const hash = window.location.hash.replace('#','').toLowerCase().trim();
  if (VALID_SUBJECTS.includes(hash)) {
    openSubject(hash);
  } else {
    // No hash or unknown hash → show home
    goHome();
  }
}

// Update URL hash when navigating (without triggering hashchange)
const _origOpenSubject = openSubject;
function openSubjectAndRoute(name) {
  history.pushState(null, '', '#' + name);
  _origOpenSubject(name);
}

function goHomeAndRoute() {
  history.pushState(null, '', window.location.pathname); // remove hash
  goHome();
}

// Listen for hash changes (back/forward browser buttons)
window.addEventListener('hashchange', handleHashRoute);

// Override openSubject globally so all callers update the URL
// (redefine after DOMContentLoaded to ensure math.js functions are ready)
document.addEventListener('DOMContentLoaded', () => {
  // Route on first load
  handleHashRoute();
});
