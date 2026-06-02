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
  if (name === 'stories')  { if(typeof initStories==='function') initStories(); }
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
  // Word of the Day
  initWOTD();
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


// ═══════════════════════════════════════════════
//  MATHEMATICS — NEW TOOLS & CLASS 5 TOPICS
// ═══════════════════════════════════════════════

// Update mathTab to include new panels
const ALL_MATH_TABS = ['calc','abacus','tables','geometry','convert','fractions','patterns','hcflcm','decimals','percent','area','roman','solve'];
const _origMathTab = mathTab;
mathTab = function(tab) {
  ALL_MATH_TABS.forEach(t => {
    const el = document.getElementById('math-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
    const btn = document.getElementById('math-nav-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'tables')   renderTimesTable(ttNum);
  if (tab === 'convert')  setConvType(document.querySelector('.conv-tab'), 'length');
  if (tab === 'abacus')   initAbacus();
  if (tab === 'fractions') drawFraction();
  if (tab === 'patterns') renderPatterns();
  if (tab === 'roman')    { convertRoman(); newRomanQuiz(); }
  if (tab === 'hcflcm')   calcHCFLCM();
};

// ── ABACUS ───────────────────────────────────
// 5-rod abacus: Ten-thousands, Thousands, Hundreds, Tens, Ones
// Each rod: 1 heaven bead (×5) + 4 earth beads (×1)
const ABACUS_COLS = [
  { label: 'T.Th', place: 10000 },
  { label: 'Th',   place: 1000  },
  { label: 'H',    place: 100   },
  { label: 'T',    place: 10    },
  { label: 'O',    place: 1     }
];
let abacusState = ABACUS_COLS.map(() => ({ heaven: 0, earth: 0 })); // 0 or 1 heaven, 0-4 earth
let abacusChallengeAnswer = 0;

function initAbacus() {
  const cont = document.getElementById('abacus-container');
  if (cont.dataset.built) { updateAbacusDisplay(); return; }
  cont.dataset.built = '1';
  const frame = document.createElement('div');
  frame.className = 'abacus-frame';
  frame.id = 'abacus-frame';

  ABACUS_COLS.forEach((col, ci) => {
    const rod = document.createElement('div');
    rod.className = 'abacus-rod';

    const label = document.createElement('div');
    label.className = 'abacus-rod-label';
    label.textContent = col.label;
    rod.appendChild(label);

    // Heaven bead (counts as 5)
    const hBead = document.createElement('div');
    hBead.className = 'abacus-bead inactive';
    hBead.id = `ab-${ci}-h`;
    hBead.title = 'Heaven bead (×5)';
    hBead.onclick = () => { abacusState[ci].heaven = abacusState[ci].heaven ? 0 : 1; updateAbacusDisplay(); };
    rod.appendChild(hBead);

    // Divider bar
    const div = document.createElement('div');
    div.className = 'abacus-divider';
    rod.appendChild(div);

    // 4 Earth beads (each counts as 1)
    for (let i = 0; i < 4; i++) {
      const eBead = document.createElement('div');
      eBead.className = 'abacus-bead inactive';
      eBead.id = `ab-${ci}-e${i}`;
      eBead.title = 'Earth bead (×1)';
      eBead.onclick = (function(col_i, bead_i) {
        return () => {
          // Toggle: clicking a lower bead activates all up to it
          const cur = abacusState[col_i].earth;
          abacusState[col_i].earth = (cur === bead_i + 1) ? bead_i : bead_i + 1;
          updateAbacusDisplay();
        };
      })(ci, i);
      rod.appendChild(eBead);
    }

    frame.appendChild(rod);
  });

  cont.appendChild(frame);
  updateAbacusDisplay();
  newAbacusChallenge();
}

function updateAbacusDisplay() {
  let total = 0;
  ABACUS_COLS.forEach((col, ci) => {
    const val = abacusState[ci].heaven * 5 + abacusState[ci].earth;
    total += val * col.place;
    // Update heaven bead visual
    const hBead = document.getElementById(`ab-${ci}-h`);
    if (hBead) hBead.className = 'abacus-bead ' + (abacusState[ci].heaven ? 'active' : 'inactive');
    // Update earth beads
    for (let i = 0; i < 4; i++) {
      const eBead = document.getElementById(`ab-${ci}-e${i}`);
      if (eBead) eBead.className = 'abacus-bead ' + (i < abacusState[ci].earth ? 'active' : 'inactive');
    }
  });
  const valEl = document.getElementById('abacus-value');
  if (valEl) valEl.textContent = total.toLocaleString();
}

function getAbacusValue() {
  return ABACUS_COLS.reduce((sum, col, ci) => sum + (abacusState[ci].heaven * 5 + abacusState[ci].earth) * col.place, 0);
}

function resetAbacus() {
  abacusState = ABACUS_COLS.map(() => ({ heaven: 0, earth: 0 }));
  updateAbacusDisplay();
}

function setAbacusNumber(n) {
  abacusState = ABACUS_COLS.map(() => ({ heaven: 0, earth: 0 }));
  let rem = Math.min(99999, Math.max(0, n));
  ABACUS_COLS.forEach((col, ci) => {
    const digit = Math.floor(rem / col.place);
    rem -= digit * col.place;
    abacusState[ci].heaven = digit >= 5 ? 1 : 0;
    abacusState[ci].earth  = digit >= 5 ? digit - 5 : digit;
  });
  updateAbacusDisplay();
}

function randomAbacus() {
  setAbacusNumber(Math.floor(Math.random() * 99999) + 1);
}

function newAbacusChallenge() {
  abacusChallengeAnswer = Math.floor(Math.random() * 9999) + 1;
  const el = document.getElementById('abacus-challenge-q');
  if (el) el.textContent = '🎯 Show the number ' + abacusChallengeAnswer.toLocaleString() + ' on the abacus';
  const fb = document.getElementById('abacus-challenge-fb');
  if (fb) fb.textContent = '';
}

function checkAbacus() {
  const current = getAbacusValue();
  const fb = document.getElementById('abacus-challenge-fb');
  if (current === abacusChallengeAnswer) {
    fb.textContent = '✅ Correct! ' + abacusChallengeAnswer.toLocaleString() + ' — Great job!';
    fb.style.color = 'var(--green)';
    setTimeout(newAbacusChallenge, 1500);
  } else {
    fb.textContent = '❌ You showed ' + current.toLocaleString() + ' — try again!';
    fb.style.color = 'var(--rose)';
  }
}

// ── FRACTIONS ────────────────────────────────
function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

function drawFraction() {
  const num = parseInt(document.getElementById('frac-num')?.value) || 1;
  const den = parseInt(document.getElementById('frac-den')?.value) || 4;
  if (!den || den < 1) return;
  const canvas = document.getElementById('frac-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw pie chart
  const cx = 100, cy = 100, r = 80;
  const sliceAngle = (2 * Math.PI) / den;
  for (let i = 0; i < den; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI/2 + i*sliceAngle, -Math.PI/2 + (i+1)*sliceAngle);
    ctx.closePath();
    ctx.fillStyle = i < num ? '#4f6ef7' : '#e5e7eb';
    ctx.fill();
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.font = 'bold 14px Nunito';
  ctx.fillStyle = '#1e1b4b';
  ctx.textAlign = 'center';
  ctx.fillText(num + ' / ' + den, cx, cy + r + 20);

  // Draw bar chart
  const bx = 230, by = 60, bw = 240, bh = 50;
  const filled = Math.min(num / den, 1);
  ctx.fillStyle = '#e5e7eb';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill();
  ctx.fillStyle = '#4f6ef7';
  ctx.beginPath(); ctx.roundRect(bx, by, bw * filled, bh, 6); ctx.fill();
  // Segment lines
  for (let i = 1; i < den; i++) {
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + (bw/den)*i, by);
    ctx.lineTo(bx + (bw/den)*i, by+bh);
    ctx.stroke();
  }
  ctx.font = 'bold 16px Nunito'; ctx.fillStyle = '#1e1b4b'; ctx.textAlign = 'center';
  ctx.fillText(num + ' / ' + den, bx + bw/2, by + bh + 22);

  // Show simplified form
  const g = gcd(Math.abs(num), den);
  const simpEl = document.getElementById('frac-simplified');
  const infoEl = document.getElementById('frac-info');
  if (simpEl) {
    if (g > 1 && num > 0) simpEl.textContent = 'Simplified: ' + (num/g) + '/' + (den/g);
    else simpEl.textContent = '';
  }
  if (infoEl) {
    const dec = (num/den).toFixed(4);
    const pct = (num/den*100).toFixed(1);
    infoEl.innerHTML = `<strong>${num}/${den}</strong> = ${dec} as a decimal = <strong>${pct}%</strong> as a percentage`;
  }
}

function calcFractions() {
  const n1 = parseInt(document.getElementById('fc-n1').value);
  const d1 = parseInt(document.getElementById('fc-d1').value);
  const n2 = parseInt(document.getElementById('fc-n2').value);
  const d2 = parseInt(document.getElementById('fc-d2').value);
  const op = document.getElementById('fc-op').value;
  let rn, rd;
  if (op === '+') { rn = n1*d2 + n2*d1; rd = d1*d2; }
  else if (op === '-') { rn = n1*d2 - n2*d1; rd = d1*d2; }
  else if (op === '×') { rn = n1*n2; rd = d1*d2; }
  else { rn = n1*d2; rd = d1*n2; }
  const g = gcd(Math.abs(rn), Math.abs(rd));
  const el = document.getElementById('fc-result');
  if (el) el.textContent = `${n1}/${d1} ${op} ${n2}/${d2} = ${rn/g}/${rd/g}` + (rd/g === 1 ? ` = ${rn/g}` : '');
}

// ── NUMBER PATTERNS ───────────────────────────
let patternQuizData = { seq: [], answer: 0 };

function renderPatterns() {
  const show = (id, arr) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = arr.slice(0,10).map((n,i)=>`<span style="display:inline-block;background:white;border:2px solid var(--border);border-radius:6px;padding:2px 8px;margin:2px;">${n}</span>`).join(' ') + ' <span style="font-size:18px;font-weight:900">…</span>';
  };
  const fib = [1,1]; for(let i=2;i<12;i++) fib.push(fib[i-1]+fib[i-2]);
  show('pat-fib', fib);
  show('pat-sq', Array.from({length:10},(_,i)=>(i+1)*(i+1)));
  show('pat-tri', Array.from({length:10},(_,i)=>(i+1)*(i+2)/2));
  // Primes
  const primes=[];for(let n=2;primes.length<10;n++){let p=true;for(let i=2;i<=Math.sqrt(n);i++)if(n%i===0){p=false;break;}if(p)primes.push(n);}
  show('pat-prime', primes);
  show('pat-pow', Array.from({length:8},(_,i)=>Math.pow(3,i+1)));
  show('pat-even', Array.from({length:10},(_,i)=>(i+1)*2));
  newPatternQuiz();
}

function newPatternQuiz() {
  const patterns = [
    { seq: [2,4,6,8,10], next: 12, hint: 'even numbers' },
    { seq: [1,4,9,16,25], next: 36, hint: 'square numbers' },
    { seq: [1,1,2,3,5,8], next: 13, hint: 'Fibonacci' },
    { seq: [3,6,12,24,48], next: 96, hint: 'multiply by 2' },
    { seq: [100,90,80,70,60], next: 50, hint: 'subtract 10' },
    { seq: [1,3,6,10,15], next: 21, hint: 'triangular numbers' },
    { seq: [5,10,15,20,25], next: 30, hint: 'multiples of 5' },
    { seq: [2,6,18,54,162], next: 486, hint: 'multiply by 3' },
    { seq: [1,8,27,64,125], next: 216, hint: 'cube numbers' },
    { seq: [32,16,8,4,2], next: 1, hint: 'divide by 2' },
  ];
  const p = patterns[Math.floor(Math.random()*patterns.length)];
  patternQuizData = { seq: p.seq, answer: p.next, hint: p.hint };
  const el = document.getElementById('pattern-quiz-q');
  if (el) el.textContent = p.seq.join(', ') + ', ❓';
  const fb = document.getElementById('pattern-fb');
  if (fb) fb.textContent = '';
  const inp = document.getElementById('pattern-answer');
  if (inp) inp.value = '';
}

function checkPatternQuiz() {
  const ans = parseInt(document.getElementById('pattern-answer')?.value);
  const fb  = document.getElementById('pattern-fb');
  if (ans === patternQuizData.answer) {
    fb.textContent = '✅ Correct! Pattern: ' + patternQuizData.hint;
    fb.style.color = 'var(--green)';
    setTimeout(newPatternQuiz, 1500);
  } else {
    fb.textContent = '❌ Not quite. Hint: ' + patternQuizData.hint;
    fb.style.color = 'var(--rose)';
  }
}

// ── HCF & LCM ────────────────────────────────
function calcHCFLCM() {
  const a = parseInt(document.getElementById('hcf-a')?.value) || 12;
  const b = parseInt(document.getElementById('hcf-b')?.value) || 18;
  if (!a || !b || a < 1 || b < 1) return;
  const h = gcd(a, b);
  const l = (a * b) / h;
  const factorsA = getFactors(a), factorsB = getFactors(b);
  const el = document.getElementById('hcflcm-result');
  if (!el) return;
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px;">
      <div class="geo-card" style="border-left:4px solid var(--blue)">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--text-l);margin-bottom:6px;">Factors of ${a}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-b)">${factorsA.map(f=>`<span style="background:${factorsB.includes(f)?'var(--blue)':'var(--bg-page)'};color:${factorsB.includes(f)?'white':'inherit'};padding:2px 7px;border-radius:4px;margin:2px;display:inline-block;font-weight:700">${f}</span>`).join('')}</div>
      </div>
      <div class="geo-card" style="border-left:4px solid var(--purple)">
        <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--text-l);margin-bottom:6px;">Factors of ${b}</div>
        <div style="font-size:13px;font-weight:600;color:var(--text-b)">${factorsB.map(f=>`<span style="background:${factorsA.includes(f)?'var(--blue)':'var(--bg-page)'};color:${factorsA.includes(f)?'white':'inherit'};padding:2px 7px;border-radius:4px;margin:2px;display:inline-block;font-weight:700">${f}</span>`).join('')}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div class="geo-card" style="text-align:center;border-left:4px solid var(--green)">
        <div style="font-size:13px;font-weight:700;color:var(--text-m)">HCF (Highest Common Factor)</div>
        <div style="font-size:42px;font-weight:900;color:var(--green)">${h}</div>
        <div style="font-size:12px;color:var(--text-m)">Common factors highlighted in blue</div>
      </div>
      <div class="geo-card" style="text-align:center;border-left:4px solid var(--amber)">
        <div style="font-size:13px;font-weight:700;color:var(--text-m)">LCM (Lowest Common Multiple)</div>
        <div style="font-size:42px;font-weight:900;color:var(--amber)">${l}</div>
        <div style="font-size:12px;color:var(--text-m)">LCM = (${a} × ${b}) ÷ HCF(${h})</div>
      </div>
    </div>`;
}
function getFactors(n) {
  const f=[];for(let i=1;i<=n;i++)if(n%i===0)f.push(i);return f;
}

// ── DECIMALS ──────────────────────────────────
function showDecimalPlace() {
  const raw = document.getElementById('dec-num')?.value || '';
  const parts = raw.split('.');
  const intPart = parts[0] || '0';
  const decPart = parts[1] || '';
  const placeNames = ['Ones','Tens','Hundreds','Thousands','Ten-Thousands'];
  const decPlaceNames = ['Tenths','Hundredths','Thousandths','Ten-Thousandths'];
  let html = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">';
  for (let i = intPart.length-1; i >= 0; i--) {
    const place = placeNames[intPart.length-1-i] || (Math.pow(10,intPart.length-1-i)+'s');
    html += `<div style="text-align:center;background:var(--blue-l);border:2px solid #c7d2fe;border-radius:8px;padding:8px 12px;"><div style="font-size:22px;font-weight:900;color:var(--blue-d)">${intPart[i]}</div><div style="font-size:10px;font-weight:700;color:var(--text-m)">${place}</div></div>`;
  }
  if (decPart) {
    html += `<div style="font-size:28px;font-weight:900;color:var(--text-l);padding:8px 4px;">.</div>`;
    for (let i = 0; i < decPart.length; i++) {
      html += `<div style="text-align:center;background:var(--amber-l);border:2px solid #fcd34d;border-radius:8px;padding:8px 12px;"><div style="font-size:22px;font-weight:900;color:#92400e">${decPart[i]}</div><div style="font-size:10px;font-weight:700;color:var(--text-m)">${decPlaceNames[i]||'…'}</div></div>`;
    }
  }
  html += '</div>';
  const el = document.getElementById('dec-place-result');
  if (el) el.innerHTML = html;
}
function convertDecFrac() {
  const input = document.getElementById('dec-frac')?.value?.trim() || '';
  const el = document.getElementById('dec-frac-result');
  if (!el) return;
  if (input.includes('/')) {
    const [n,d] = input.split('/').map(Number);
    if (!d) return;
    el.textContent = `${n}/${d} = ${(n/d).toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
  } else {
    const dec = parseFloat(input);
    if (isNaN(dec)) return;
    const decimals = (input.split('.')[1]||'').length;
    const denom = Math.pow(10, decimals);
    const num = Math.round(dec * denom);
    const g = gcd(num, denom);
    el.textContent = `${dec} = ${num/g}/${denom/g}`;
  }
}
function calcDecOp() {
  const a = parseFloat(document.getElementById('dec-op-a')?.value);
  const b = parseFloat(document.getElementById('dec-op-b')?.value);
  const op = document.getElementById('dec-op')?.value;
  let res;
  if (op==='+') res=a+b; else if(op==='-') res=a-b; else if(op==='×') res=a*b; else res=b?a/b:0;
  const el = document.getElementById('dec-op-result');
  if (el) el.textContent = `${a} ${op} ${b} = ${parseFloat(res.toFixed(8))}`;
}
function roundDecimal() {
  const n = parseFloat(document.getElementById('dec-round-n')?.value);
  const p = parseInt(document.getElementById('dec-round-p')?.value);
  const el = document.getElementById('dec-round-result');
  if (el) el.textContent = `${n} rounded to ${p} d.p. = ${n.toFixed(p)}`;
}

// ── PERCENTAGES ───────────────────────────────
function calcPctOf() {
  const x=parseFloat(document.getElementById('pct-x')?.value);
  const y=parseFloat(document.getElementById('pct-y')?.value);
  const res=(x/100)*y;
  const el=document.getElementById('pct-of-result');
  if(el) el.innerHTML=`${x}% of ${y} = <strong>${res}</strong>`;
  drawPctBar(x/100);
}
function calcWhatPct() {
  const a=parseFloat(document.getElementById('pct-a')?.value);
  const b=parseFloat(document.getElementById('pct-b')?.value);
  const res=(a/b*100).toFixed(2);
  const el=document.getElementById('pct-what-result');
  if(el) el.innerHTML=`${a} is <strong>${res}%</strong> of ${b}`;
  drawPctBar(a/b);
}
function calcPctChange() {
  const orig=parseFloat(document.getElementById('pct-orig')?.value);
  const newv=parseFloat(document.getElementById('pct-new')?.value);
  const pct=((newv-orig)/orig*100).toFixed(2);
  const el=document.getElementById('pct-change-result');
  const dir=pct>=0?'📈 Increase':'📉 Decrease';
  if(el) el.innerHTML=`${dir} of <strong>${Math.abs(pct)}%</strong>`;
  drawPctBar(Math.min(newv/orig,1));
}
function drawPctBar(ratio) {
  const canvas=document.getElementById('pct-bar-canvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const r=Math.max(0,Math.min(1,ratio||0));
  ctx.fillStyle='#e5e7eb'; ctx.beginPath(); ctx.roundRect(10,20,220,40,8); ctx.fill();
  const grad=ctx.createLinearGradient(10,0,230,0);
  grad.addColorStop(0,'#4f6ef7'); grad.addColorStop(1,'#8b5cf6');
  ctx.fillStyle=grad; ctx.beginPath(); ctx.roundRect(10,20,220*r,40,8); ctx.fill();
  ctx.font='bold 14px Nunito'; ctx.fillStyle='#1e1b4b'; ctx.textAlign='center';
  ctx.fillText(Math.round(r*100)+'%', 120, 72);
  const lbl=document.getElementById('pct-bar-label');
  if(lbl) lbl.textContent=Math.round(r*100)+'% filled';
}

// ── AREA & VOLUME ─────────────────────────────
function calcVolume(shape) {
  const fmt=n=>Math.round(n*100)/100;
  const pi=Math.PI;
  let html='';
  if(shape==='cuboid') {
    const l=parseFloat(document.getElementById('cub-l').value);
    const w=parseFloat(document.getElementById('cub-w').value);
    const h=parseFloat(document.getElementById('cub-h').value);
    if([l,w,h].some(isNaN)){showGeoResult('cuboid-result','⚠️ Enter all 3 values');return;}
    html=`📦 Volume = ${fmt(l*w*h)} cm³<br>📐 Surface Area = ${fmt(2*(l*w+w*h+h*l))} cm²`;
  } else if(shape==='cylinder') {
    const r=parseFloat(document.getElementById('cyl-r').value);
    const h=parseFloat(document.getElementById('cyl-h').value);
    if([r,h].some(isNaN)){showGeoResult('cylinder-result','⚠️ Enter radius and height');return;}
    html=`🔵 Volume = ${fmt(pi*r*r*h)} cm³<br>📐 Curved Surface = ${fmt(2*pi*r*h)} cm²<br>📏 Total Surface = ${fmt(2*pi*r*(r+h))} cm²`;
  } else if(shape==='prism') {
    const b=parseFloat(document.getElementById('prism-b').value);
    const h=parseFloat(document.getElementById('prism-h').value);
    const l=parseFloat(document.getElementById('prism-l').value);
    if([b,h,l].some(isNaN)){showGeoResult('prism-result','⚠️ Enter all values');return;}
    html=`🔺 Volume = ${fmt(0.5*b*h*l)} cm³<br>📐 Cross-section Area = ${fmt(0.5*b*h)} cm²`;
  } else if(shape==='sphere') {
    const r=parseFloat(document.getElementById('sph-r').value);
    if(isNaN(r)){showGeoResult('sphere-result','⚠️ Enter radius');return;}
    html=`⚽ Volume = ${fmt(4/3*pi*r*r*r)} cm³<br>📐 Surface Area = ${fmt(4*pi*r*r)} cm²`;
  }
  showGeoResult(shape+'-result', html);
}

// ── ROMAN NUMERALS ────────────────────────────
const ROMAN_MAP = [['M',1000],['CM',900],['D',500],['CD',400],['C',100],['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]];
function toRoman(n) {
  if(n<1||n>3999) return 'Out of range (1–3999)';
  let result='';
  ROMAN_MAP.forEach(([r,v])=>{while(n>=v){result+=r;n-=v;}});
  return result;
}
function fromRoman(s) {
  const vals={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
  s=s.toUpperCase().trim();
  let total=0;
  for(let i=0;i<s.length;i++){
    const cur=vals[s[i]]||0, nxt=vals[s[i+1]]||0;
    total+=cur<nxt?-cur:cur;
  }
  return total;
}
function convertRoman() {
  const n=parseInt(document.getElementById('rom-num')?.value)||2024;
  const el=document.getElementById('rom-result');
  if(el) el.textContent=toRoman(n);
}
function convertFromRoman() {
  const s=document.getElementById('rom-input')?.value||'';
  const n=fromRoman(s);
  const el=document.getElementById('rom-from-result');
  if(el) el.textContent=n>0?n:'Invalid';
}
let romanQuizMode='toRoman', romanQuizAnswer='';
function newRomanQuiz() {
  romanQuizMode=Math.random()<0.5?'toRoman':'fromRoman';
  const n=Math.floor(Math.random()*99)+1;
  const el=document.getElementById('roman-quiz-q');
  const ans=document.getElementById('roman-quiz-ans');
  const fb=document.getElementById('roman-quiz-fb');
  if(ans) ans.value='';
  if(fb) fb.textContent='';
  if(el) {
    if(romanQuizMode==='toRoman'){
      el.textContent='Write '+n+' in Roman numerals:';
      romanQuizAnswer=toRoman(n);
    } else {
      const r=toRoman(n);
      el.textContent='What is '+r+' in numbers?';
      romanQuizAnswer=String(n);
    }
  }
}
function checkRomanQuiz() {
  const ans=(document.getElementById('roman-quiz-ans')?.value||'').trim().toUpperCase();
  const fb=document.getElementById('roman-quiz-fb');
  if(ans.toUpperCase()===romanQuizAnswer.toUpperCase()){
    fb.textContent='✅ Correct! '+romanQuizAnswer; fb.style.color='var(--green)';
    setTimeout(newRomanQuiz,1200);
  } else {
    fb.textContent='❌ Answer is '+romanQuizAnswer; fb.style.color='var(--rose)';
  }
}

// ═══════════════════════════════════════════════
//  SCIENCE — CLASS 5 TOPICS & NEW PANELS
// ═══════════════════════════════════════════════

const ALL_SCI_TABS = ['body','plants','animals','foodchain','periodic','matter','forces','solar','water','rocks','health','explain'];

sciTab = function(tab) {
  ALL_SCI_TABS.forEach(t => {
    const el = document.getElementById('sci-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
    const btn = document.getElementById('sci-nav-' + t);
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'periodic') buildPeriodicTable();
  if (tab === 'solar')    drawSolarSystem();
  if (tab === 'water')    drawWaterCycle();
  if (tab === 'foodchain') initFoodChain();
};

// ── SCIENCE TOPIC CARDS (Knowledge Base) ─────
const SCI_KNOWLEDGE = {
  // Plants
  'parts-of-plant': { title:'Parts of a Plant', body:'A plant has <strong>roots</strong> (anchor + absorb water), <strong>stem</strong> (carries water up), <strong>leaves</strong> (make food), <strong>flowers</strong> (reproduction), <strong>fruits</strong> (protect seeds).', fact:'The tallest plant is the coast redwood tree — over 115 metres tall!' },
  'photosynthesis': { title:'Photosynthesis', body:'Plants make their own food using <strong>sunlight + water + CO₂</strong>. Leaves contain <strong>chlorophyll</strong> (green pigment) which captures sunlight. Formula: CO₂ + H₂O + Light → Glucose + O₂', fact:'One large tree produces enough oxygen for 4 people per day!' },
  'pollination': { title:'Pollination', body:'Pollen moves from one flower to another by <strong>wind, insects, birds or water</strong>. Bees are the most important pollinators. Cross-pollination creates genetic diversity in plants.', fact:'One-third of all food humans eat depends on bee pollination.' },
  'germination': { title:'Germination', body:'Seeds need <strong>water, warmth, and air</strong> to germinate. The seed coat breaks open, the radicle (root) grows down, and the plumule (shoot) grows upward toward light.', fact:'Some seeds can stay dormant for thousands of years before germinating.' },
  'plant-reproduction': { title:'Plant Reproduction', body:'Plants reproduce <strong>sexually</strong> (seeds from flowers) or <strong>vegetatively</strong> (cuttings, runners, bulbs, spores). Mosses and ferns use spores. Flowering plants use seeds.', fact:'The lotus plant symbol is sacred in many Asian cultures and reproduces using seeds.' },
  'leaves-and-roots': { title:'Leaves and Roots', body:'<strong>Leaves</strong>: flat surface for sunlight, stomata for gas exchange, veins carry water. <strong>Roots</strong>: fibrous (grass) or taproot (carrot). Root hairs increase absorption area.', fact:'A single rye plant can have 14 billion root hairs.' },
  // Animals
  'mammals': { title:'Mammals', body:'Warm-blooded, have <strong>hair/fur</strong>, breathe air, give birth to live young (mostly), feed young with <strong>milk</strong>. Examples: humans, whales, bats, dogs.', fact:'The blue whale is the largest mammal ever — heart the size of a car!' },
  'birds': { title:'Birds', body:'Warm-blooded vertebrates with <strong>feathers, beaks, two wings</strong>. Lay hard-shelled eggs. Most can fly. Examples: eagle, penguin, ostrich, parrot.', fact:'Peregrine falcon is the fastest animal — dives at 389 km/h!' },
  'reptiles': { title:'Reptiles', body:'Cold-blooded, covered in <strong>scales</strong>, breathe air, most lay eggs. Examples: snakes, lizards, crocodiles, turtles. Regulate body temperature through behaviour.', fact:'Crocodiles have been on Earth for 240 million years — older than dinosaurs!' },
  'amphibians': { title:'Amphibians', body:'Cold-blooded, live both in <strong>water and on land</strong>. Moist skin for breathing. Lay eggs in water. Examples: frogs, toads, salamanders, newts.', fact:'The golden poison dart frog is the most toxic animal on Earth.' },
  'fish': { title:'Fish', body:'Cold-blooded, live in water, breathe through <strong>gills</strong>, have <strong>scales and fins</strong>. Examples: salmon, shark, goldfish, clownfish.', fact:'The whale shark is the largest fish — up to 12 metres long but eats tiny plankton.' },
  'insects': { title:'Insects', body:'<strong>6 legs, 3 body parts</strong> (head, thorax, abdomen), most have wings. Undergo metamorphosis. Examples: ants, butterflies, bees, beetles.', fact:'Ants can carry 10–50 times their own body weight!' },
  'adaptation': { title:'Animal Adaptation', body:'Animals develop features to survive in their environment. <strong>Polar bear</strong>: thick fur + white colour. <strong>Camel</strong>: hump stores fat, wide feet for sand. <strong>Duck</strong>: webbed feet for swimming.', fact:'The Arctic fox changes colour — brown in summer, white in winter for camouflage.' },
  'migration': { title:'Migration', body:'Animals travel long distances for <strong>food, warmth, or breeding</strong>. Arctic tern migrates 70,000 km per year! Birds navigate using Earth\'s magnetic field and the stars.', fact:'Monarch butterflies travel 4,500 km from Canada to Mexico every year.' },
  // States of Matter
  'solid': { title:'Solid', body:'Particles are <strong>tightly packed</strong> in fixed positions. Solids have a definite shape and volume. They cannot be compressed easily. Examples: ice, rock, wood, iron.', fact:'Diamond is the hardest natural solid — it scores 10 on the Mohs hardness scale.' },
  'liquid': { title:'Liquid', body:'Particles are <strong>close together but can move</strong> around. Liquids have a definite volume but take the shape of their container. Examples: water, milk, oil, mercury.', fact:'Water is the only substance that naturally exists as solid, liquid and gas on Earth.' },
  'gas': { title:'Gas', body:'Particles are <strong>far apart and move freely</strong>. Gases have no fixed shape or volume and fill any container. Examples: oxygen, steam, carbon dioxide, air.', fact:'Air is 78% nitrogen, 21% oxygen, and only 0.04% carbon dioxide.' },
  'melting-freezing': { title:'Melting and Freezing', body:'<strong>Melting</strong>: solid → liquid (absorbs heat). <strong>Freezing</strong>: liquid → solid (releases heat). Water melts at 0°C. Iron melts at 1538°C. Each substance has its own melting point.', fact:'Gallium melts in your hand — its melting point is just 29.7°C!' },
  'evaporation-condensation': { title:'Evaporation & Condensation', body:'<strong>Evaporation</strong>: liquid → gas (surface). <strong>Condensation</strong>: gas → liquid (cooling). Water vapour condenses on cold surfaces forming droplets. Both are part of the water cycle.', fact:'Sweat evaporates from skin to cool your body — this is why you sweat when hot.' },
  'sublimation': { title:'Sublimation', body:'Solid changes directly to gas <strong>without becoming liquid</strong>. Dry ice (solid CO₂) sublimates at -78°C. Iodine also sublimates when heated. Used in freeze-drying food.', fact:'The white "smoke" from dry ice is actually water vapour condensing — not CO₂ itself!' },
  // Forces
  'gravity': { title:'Gravity', body:'An invisible <strong>pulling force</strong> between all objects with mass. Earth\'s gravity pulls everything toward its centre. Gravity keeps planets in orbit around the Sun. The Moon\'s gravity causes ocean tides.', fact:'On the Moon you weigh only 1/6 of your Earth weight — you could jump 6× higher!' },
  'friction': { title:'Friction', body:'A force that <strong>opposes motion</strong> when two surfaces rub together. Rough surfaces have more friction than smooth ones. Friction generates heat. It helps us walk and cars brake.', fact:'Ice is slippery because a thin layer of water forms under pressure, reducing friction.' },
  'magnetism': { title:'Magnetism', body:'Magnets attract <strong>iron, cobalt, and nickel</strong>. All magnets have North and South poles. Like poles repel, opposite poles attract. Earth itself is a giant magnet with magnetic poles.', fact:'MRI machines use magnets 30,000× stronger than Earth\'s magnetic field to scan your body.' },
  'simple-machines': { title:'Simple Machines', body:'Six types: <strong>lever, wheel & axle, pulley, inclined plane, wedge, screw</strong>. They reduce the force needed to do work. Examples: scissors (lever), bicycle wheel, ramp (inclined plane).', fact:'Ancient Egyptians used simple machines to build the pyramids 4,500 years ago.' },
  'light': { title:'Light', body:'Light travels at <strong>300,000 km per second</strong>. It travels in straight lines. It can be reflected (mirror) and refracted (bent when entering water). Prisms split white light into a rainbow spectrum.', fact:'Sunlight takes 8 minutes and 20 seconds to travel from the Sun to Earth.' },
  'sound': { title:'Sound', body:'Sound is caused by <strong>vibrations</strong> that travel through a medium (solid, liquid or gas). Travels fastest in solids. Pitch = frequency. Volume = amplitude. Cannot travel in a vacuum.', fact:'Lightning and thunder happen at the same time — but light reaches you faster than sound.' },
  // Water cycle
  'evaporation': { title:'Evaporation', body:'Heat from the Sun causes water from oceans, lakes and rivers to turn into <strong>water vapour</strong> and rise into the atmosphere. Evaporation is fastest on hot, dry, windy days.', fact:'The oceans evaporate about 1.4 billion km³ of water per year.' },
  'condensation': { title:'Condensation', body:'As water vapour rises and cools, it turns back into <strong>tiny water droplets</strong> forming clouds and fog. Clouds form when condensation occurs around tiny dust particles.', fact:'Clouds can weigh over 500,000 kg but stay up because the droplets are so light and spread out.' },
  'precipitation': { title:'Precipitation', body:'When water droplets in clouds become too heavy, they fall as <strong>rain, snow, sleet or hail</strong>. The type depends on temperature. Raindrops fall at about 9 km/h.', fact:'The wettest place on Earth is Mawsynram, India — over 11,870 mm of rain per year!' },
  'collection': { title:'Collection (Run-off)', body:'Precipitation collects in <strong>oceans, rivers, lakes and underground</strong> (groundwater). Plants absorb some through roots. The rest flows back to oceans, starting the cycle again.', fact:'97% of all water on Earth is saltwater in the oceans. Only 3% is freshwater.' },
  // Rocks
  'igneous-rocks': { title:'Igneous Rocks', body:'Formed when <strong>magma (molten rock) cools and solidifies</strong>. Intrusive (underground, slow cooling = large crystals): granite. Extrusive (surface, fast cooling = small crystals): basalt, obsidian.', fact:'The Giant\'s Causeway in Ireland is made of basalt columns formed from volcanic lava.' },
  'sedimentary-rocks': { title:'Sedimentary Rocks', body:'Formed from <strong>layers of sediment</strong> (sand, shells, mud) compressed over millions of years. Often contain fossils. Examples: sandstone, limestone, chalk, coal.', fact:'The White Cliffs of Dover are made of chalk formed from microscopic sea creatures 70 million years ago.' },
  'metamorphic-rocks': { title:'Metamorphic Rocks', body:'Formed when existing rocks are changed by <strong>extreme heat and pressure</strong> deep underground. Marble (from limestone), slate (from shale), quartzite (from sandstone).', fact:'Diamonds form in metamorphic conditions deep in Earth\'s mantle under extreme pressure.' },
  'soil-types': { title:'Types of Soil', body:'<strong>Sandy soil</strong>: large particles, drains fast, not very fertile. <strong>Clay soil</strong>: tiny particles, holds water, heavy. <strong>Loam</strong>: mixture of sand, silt, clay — ideal for farming. <strong>Humus</strong>: decomposed organic matter.', fact:'It takes 1,000 years to form just 1 cm of topsoil naturally.' },
  'erosion': { title:'Erosion', body:'The wearing away of land by <strong>wind, water, ice or gravity</strong>. River erosion carves valleys. Wind erodes deserts. Coastal erosion shapes cliffs. Plants help prevent erosion by holding soil.', fact:'The Grand Canyon was carved by the Colorado River over 5–6 million years — now 1.6 km deep.' },
  'rock-cycle': { title:'The Rock Cycle', body:'Rocks continuously change: <strong>magma → igneous → weathering → sediment → sedimentary → heat/pressure → metamorphic → melting → magma</strong>. This cycle takes millions of years.', fact:'Rock cycles helped form all the continents and mountains we see today.' },
  // Health
  'balanced-diet': { title:'Balanced Diet', body:'Eat the right amounts of <strong>carbohydrates, proteins, fats, vitamins, minerals, water and fibre</strong>. Use the food pyramid as a guide. Variety is key — no single food has everything you need.', fact:'Water makes up about 60% of the human body — you need to drink 6–8 glasses per day.' },
  'food-groups': { title:'Food Groups', body:'<strong>Carbohydrates</strong> (energy): rice, bread, pasta. <strong>Proteins</strong> (growth): meat, eggs, lentils. <strong>Fats</strong> (energy storage): butter, nuts. <strong>Vitamins & Minerals</strong> (body functions): fruits, vegetables.', fact:'Vitamin C was discovered after sailors got scurvy (gum disease) from not eating fruits on long voyages.' },
  'personal-hygiene': { title:'Personal Hygiene', body:'Wash hands for 20 seconds with soap — especially before eating and after using the toilet. Brush teeth twice daily. Bathe regularly. Keep nails short and clean. Wear clean clothes.', fact:'Regular handwashing can reduce diarrhoea cases by 40% and respiratory infections by 20%.' },
  'diseases-germs': { title:'Diseases and Germs', body:'Germs include <strong>bacteria, viruses, fungi and parasites</strong>. They spread through air, water, food, touch and insects. Vaccines help prevent diseases. Antibiotics fight bacterial infections.', fact:'Your body has more bacterial cells than human cells — most are helpful!' },
  'first-aid': { title:'First Aid', body:'For <strong>cuts</strong>: clean wound, apply pressure, bandage. For <strong>burns</strong>: cool with running water for 10 min. For <strong>choking</strong>: back blows then abdominal thrusts. Always call an adult in emergencies.', fact:'The word "ambulance" is written backwards on ambulances so drivers can read it in their rearview mirror.' },
  'exercise-sleep': { title:'Exercise and Sleep', body:'Children need <strong>at least 60 minutes of physical activity</strong> per day. Exercise strengthens heart, bones, muscles and improves mood. Children aged 6–12 need <strong>9–11 hours of sleep</strong> per night.', fact:'During sleep, your brain consolidates memories — this is why sleep improves learning!' },
};

function showSciCard(topic) {
  const data = SCI_KNOWLEDGE[topic];
  if (!data) return;
  // Find the detail div for the current panel
  const detailDivs = document.querySelectorAll('.sci-detail-card');
  detailDivs.forEach(d => {
    d.innerHTML = `<h3>💡 ${data.title}</h3><div>${data.body}</div><div class="fact-box">🌟 Did you know? ${data.fact}</div>`;
    d.style.display = '';
    d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// ── SOLAR SYSTEM ──────────────────────────────
const PLANETS = [
  { name:'Sun',     r:28, color:'#FDB813', orbit:0,   info:'The Sun is a star. It contains 99.86% of the solar system\'s mass. Surface temperature: 5,500°C.' },
  { name:'Mercury', r:4,  color:'#b5b5b5', orbit:60,  info:'Smallest planet. No atmosphere. Extreme temperatures: -180°C to +430°C. 88 days to orbit Sun.' },
  { name:'Venus',   r:7,  color:'#e8cda0', orbit:95,  info:'Hottest planet at 465°C (greenhouse effect). Rotates backwards. Nearly same size as Earth.' },
  { name:'Earth',   r:7,  color:'#4f9de8', orbit:130, info:'Our home! Only known planet with life. 71% water. One moon. Perfect distance from Sun.' },
  { name:'Mars',    r:5,  color:'#c1440e', orbit:165, info:'The Red Planet. Has the largest volcano (Olympus Mons). Two moons. Day is 24h 37min.' },
  { name:'Jupiter', r:16, color:'#c88b3a', orbit:225, info:'Largest planet — fits 1,300 Earths. Great Red Spot is a storm lasting 350+ years. 95 moons!' },
  { name:'Saturn',  r:13, color:'#e8d5a3', orbit:280, info:'Has spectacular rings made of ice and rock. Least dense planet — would float in water! 146 moons.' },
  { name:'Uranus',  r:10, color:'#7de8e8', orbit:325, info:'Rotates on its side (97.8° tilt). Ice giant. Coldest planet (-224°C). 27 moons.' },
  { name:'Neptune', r:9,  color:'#3f54ba', orbit:360, info:'Farthest planet. Strongest winds: 2,100 km/h. 164 years to orbit Sun. 16 moons.' },
];

function drawSolarSystem() {
  const canvas = document.getElementById('solar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  // Background stars
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random()*0.6+0.2})`;
    ctx.beginPath();
    ctx.arc(Math.random()*W, Math.random()*H, Math.random()*1.2, 0, Math.PI*2);
    ctx.fill();
  }
  // Draw orbits and planets
  PLANETS.forEach((p, i) => {
    if (i === 0) {
      // Sun at left
      const grd = ctx.createRadialGradient(50, H/2, 0, 50, H/2, p.r);
      grd.addColorStop(0, '#fff7a0'); grd.addColorStop(0.4, p.color); grd.addColorStop(1, 'rgba(253,184,19,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(50, H/2, p.r, 0, Math.PI*2); ctx.fill();
    } else {
      // Orbit line
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(50, H/2, p.orbit, 0, Math.PI*2); ctx.stroke();
      // Planet
      const angle = -Math.PI / 4 * (i * 0.7);
      const px = 50 + p.orbit * Math.cos(angle);
      const py = H/2 + p.orbit * Math.sin(angle) * 0.45;
      const grd = ctx.createRadialGradient(px-p.r*0.3, py-p.r*0.3, 0, px, py, p.r);
      grd.addColorStop(0, 'white'); grd.addColorStop(0.3, p.color); grd.addColorStop(1, '#000');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(px, py, p.r, 0, Math.PI*2); ctx.fill();
      // Saturn rings
      if (p.name === 'Saturn') {
        ctx.strokeStyle = 'rgba(232,213,163,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(px, py, p.r+10, 4, 0, 0, Math.PI*2); ctx.stroke();
      }
      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '9px Nunito'; ctx.textAlign = 'center';
      ctx.fillText(p.name, px, py + p.r + 10);
    }
  });
  // Click handler
  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width/rect.width);
    const my = (e.clientY - rect.top)  * (canvas.height/rect.height);
    let found = null;
    PLANETS.forEach((p, i) => {
      const px = i === 0 ? 50 : 50 + p.orbit * Math.cos(-Math.PI/4*(i*0.7));
      const py = i === 0 ? canvas.height/2 : canvas.height/2 + p.orbit * Math.sin(-Math.PI/4*(i*0.7)) * 0.45;
      if (Math.hypot(mx-px, my-py) < p.r + 8) found = p;
    });
    const det = document.getElementById('solar-detail');
    if (det) {
      if (found) {
        det.innerHTML = `<div style="background:var(--white);border:2px solid var(--border);border-left:4px solid #4f6ef7;border-radius:var(--r-md);padding:14px 18px;"><strong style="font-size:16px">${found.name}</strong><br><span style="font-size:14px;color:var(--text-b)">${found.info}</span></div>`;
      } else {
        det.innerHTML = '<div style="color:var(--text-l);font-size:13px;font-weight:600;padding:8px">👆 Click on a planet to learn about it</div>';
      }
    }
  };
  const det = document.getElementById('solar-detail');
  if (det && !det.innerHTML) det.innerHTML = '<div style="color:var(--text-l);font-size:13px;font-weight:600;padding:8px">👆 Click on a planet to learn about it</div>';
}

// ── WATER CYCLE ───────────────────────────────
function drawWaterCycle() {
  const canvas = document.getElementById('water-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H*0.6);
  sky.addColorStop(0, '#87ceeb'); sky.addColorStop(1, '#e0f0ff');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H*0.65);

  // Ground
  const gnd = ctx.createLinearGradient(0, H*0.65, 0, H);
  gnd.addColorStop(0, '#8b6914'); gnd.addColorStop(1, '#654321');
  ctx.fillStyle = gnd; ctx.fillRect(0, H*0.65, W, H*0.35);

  // Ocean
  ctx.fillStyle = '#2980b9';
  ctx.beginPath(); ctx.ellipse(100, H*0.78, 90, 32, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'white'; ctx.font = 'bold 13px Nunito'; ctx.textAlign = 'center';
  ctx.fillText('Ocean', 100, H*0.78+5);

  // Mountain
  ctx.fillStyle = '#7f8c8d';
  ctx.beginPath(); ctx.moveTo(520, H*0.65); ctx.lineTo(600, H*0.2); ctx.lineTo(680, H*0.65); ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.moveTo(580, H*0.22); ctx.lineTo(600, H*0.2); ctx.lineTo(620, H*0.22); ctx.fill();

  // Sun
  ctx.fillStyle = '#f9ca24';
  ctx.beginPath(); ctx.arc(620, 45, 30, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#e58e26'; ctx.font = 'bold 12px Nunito'; ctx.textAlign = 'center';
  ctx.fillText('☀️ Sun', 620, 48);

  // Cloud
  ctx.fillStyle = 'white';
  [[320,70,40],[360,55,50],[400,70,40]].forEach(([x,y,r]) => { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = '#555'; ctx.font = 'bold 12px Nunito';
  ctx.fillText('☁️ Cloud', 360, 115);

  // Arrows and labels
  const arrow = (x1,y1,x2,y2,color,label,lx,ly) => {
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash([5,3]);
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]);
    const a = Math.atan2(y2-y1, x2-x1);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x2-12*Math.cos(a-0.4),y2-12*Math.sin(a-0.4)); ctx.lineTo(x2-12*Math.cos(a+0.4),y2-12*Math.sin(a+0.4)); ctx.fill();
    ctx.font = 'bold 12px Nunito'; ctx.fillStyle = color; ctx.textAlign = 'center';
    ctx.fillText(label, lx, ly);
  };
  arrow(130, H*0.65, 280, 90, '#e74c3c', '① Evaporation', 180, H*0.35);
  arrow(340, 120, 200, H*0.62, '#3498db', '③ Precipitation', 240, H*0.45);
  arrow(460, 80, 350, 72, '#9b59b6', '② Wind / Clouds', 410, 60);
  arrow(185, H*0.68, 110, H*0.75, '#27ae60', '④ Run-off', 130, H*0.69);
}

// ── FOOD CHAIN ────────────────────────────────
const FOOD_CHAIN_SETS = [
  { name:'Grassland', chain:['🌾 Grass','🐛 Caterpillar','🐦 Robin','🦅 Hawk'] },
  { name:'Ocean',     chain:['🌿 Algae','🦐 Shrimp','🐟 Fish','🦈 Shark'] },
  { name:'Forest',    chain:['🍂 Leaf','🐛 Worm','🐸 Frog','🐍 Snake'] },
  { name:'Arctic',    chain:['🌱 Plankton','🐠 Small Fish','🦭 Seal','🐻‍❄️ Polar Bear'] },
];

function initFoodChain() {
  const cont = document.getElementById('foodchain-container');
  let html = '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px;">';
  FOOD_CHAIN_SETS.forEach((set, i) => {
    html += `<button class="example-btn" onclick="showFoodChain(${i})" style="font-size:13px;padding:8px 16px;">${set.name}</button>`;
  });
  html += '</div><div id="foodchain-display"></div>';
  cont.innerHTML = html;
  showFoodChain(0);
}

function showFoodChain(idx) {
  const set = FOOD_CHAIN_SETS[idx];
  const el = document.getElementById('foodchain-display');
  if (!el) return;
  const items = set.chain.map((item, i) => {
    const labels = ['Producer','Primary Consumer','Secondary Consumer','Apex Predator'];
    const colors = ['var(--green-l)','var(--blue-l)','var(--amber-l)','var(--rose-l)'];
    const borders = ['var(--green)','var(--blue)','var(--amber)','var(--rose)'];
    return `<div style="text-align:center;"><div style="background:${colors[i]};border:2px solid ${borders[i]};border-radius:var(--r-md);padding:14px 18px;display:inline-block;min-width:120px;"><div style="font-size:28px;">${item.split(' ')[0]}</div><div style="font-size:13px;font-weight:800;color:var(--text-h);margin-top:4px;">${item.split(' ').slice(1).join(' ')}</div><div style="font-size:10px;font-weight:700;color:var(--text-m);margin-top:2px;">${labels[i]}</div></div>${i<set.chain.length-1?'<div style="font-size:24px;margin:4px 0;color:var(--text-m)">↓ eats</div>':''}</div>`;
  }).join('');
  el.innerHTML = `<h3 style="font-size:15px;font-weight:900;color:var(--text-h);margin-bottom:12px;">${set.name} Food Chain</h3><div style="display:flex;align-items:center;gap:0;flex-direction:column;">${items}</div><div style="margin-top:14px;padding:12px 14px;background:var(--green-l);border-radius:var(--r-sm);font-size:13px;font-weight:600;color:#15803d;">⚡ Energy flows from Sun → Producer → Consumers. Each level gets ~10% of the energy from the level below.</div>`;
}

// ═══════════════════════════════════════════════════════
//  WORD OF THE DAY
// ═══════════════════════════════════════════════════════

const WOTD_WORDS = [
  'curious','brave','ancient','enormous','magnificent','peculiar','adventure',
  'champion','discover','illuminate','eloquent','harmony','persevere','triumph',
  'wisdom','radiant','courageous','imagine','transform','graceful','curious',
  'vibrant','resilient','compassion','inspire','perseverance','diligent','serene',
  'ambition','flourish','gratitude','integrity','journey','kindness','luminous',
  'majestic','nurture','optimistic','profound','quest','remarkable','steadfast',
  'tenacious','unique','vivid','wonder','xenial','yearning','zealous',
  'accomplish','balance','clarity','dedicate','elevate','focus','genuine',
  'humble','innovate','jubilant','knowledge','liberate','mindful','noble',
  'observe','patient','question','reflect','sincere','thoughtful','understand',
  'volunteer','witness','excel','yearn','zeal','achieve','believe','create',
  'dream','explore','flourish','grow','hope','improve','justice',
  'learn','motivate','nourish','open','pursue','rise','study',
  'thrive','uplift','value','willing','experience','yearn','bloom',
  'calm','daring','eager','fair','glad','honest','independent',
  'joyful','keen','lively','mighty','natural','observant','peaceful',
  'quick','reliable','spirited','thankful','unique','vast','wise'
];

const WOTD_EMOJIS = {
  curious:'🔍', brave:'🦁', ancient:'🏛️', enormous:'🐘', magnificent:'👑',
  peculiar:'🎭', adventure:'⚔️', champion:'🏆', discover:'🔭', illuminate:'💡',
  eloquent:'🎤', harmony:'🎵', persevere:'💪', triumph:'🥇', wisdom:'🦉',
  radiant:'☀️', courageous:'🦸', imagine:'💭', transform:'🦋', graceful:'🩰',
  vibrant:'🌈', resilient:'🌱', compassion:'💙', inspire:'✨', diligent:'📚',
  serene:'🌊', ambition:'🚀', flourish:'🌺', gratitude:'🙏', integrity:'⚖️',
  journey:'🗺️', kindness:'🤝', luminous:'🌟', majestic:'🦅', nurture:'🌱',
  optimistic:'😊', profound:'🌌', quest:'🗡️', remarkable:'🎯', steadfast:'⚓',
  tenacious:'🦈', unique:'🦄', vivid:'🎨', wonder:'🪄', yearning:'🌠',
  accomplish:'🏅', balance:'⚖️', clarity:'💎', dedicate:'🎯', elevate:'🚀',
  focus:'🎯', genuine:'💫', humble:'🌸', innovate:'💡', jubilant:'🎉',
  knowledge:'📖', liberate:'🦅', mindful:'🧘', noble:'👑', observe:'🔭',
  patient:'⏳', question:'❓', reflect:'🪞', sincere:'💝', thoughtful:'🤔',
  thrive:'🌿', bloom:'🌸', dream:'🌙', explore:'🗺️', grow:'🌱',
  hope:'🌈', learn:'📚', rise:'⬆️', study:'✏️', achieve:'🏆', believe:'⭐'
};

let wotdData = null; // current word data
let wotdQuizData = null;

// ── Pick today's word deterministically (same word all day) ──
function getWOTDWord() {
  const today = new Date();
  const seed  = today.getFullYear() * 10000 + (today.getMonth()+1) * 100 + today.getDate();
  return WOTD_WORDS[seed % WOTD_WORDS.length];
}

// ── Main init — called from loadHomeStats ──
// ── Toggle open/close the expanded panel ──
let wotdOpen = false;
function toggleWOTD() {
  const panel   = document.getElementById('wotd-panel');
  const pill    = document.getElementById('wotd-pill');
  if (!panel) return;
  wotdOpen = !wotdOpen;
  panel.style.display = wotdOpen ? '' : 'none';
  if (pill) pill.classList.toggle('open', wotdOpen);
}

async function initWOTD() {
  const section = document.getElementById('wotd-section');
  if (!section) return;

  // Check cache — same word all day
  const today = new Date().toDateString();
  try {
    const cached = JSON.parse(localStorage.getItem('lb_wotd') || 'null');
    const badMeaning = !cached || !cached.meaning
      || cached.meaning.includes('wonderful English word')
      || cached.meaning.includes('worth exploring today');
    if (cached && cached.date === today && cached.word && !badMeaning) {
      wotdData = cached;
      renderWOTD(cached);
      return;
    }
    // Clear stale/bad cache
    if (cached) try { localStorage.removeItem('lb_wotd'); } catch {}
  } catch {}

  const word = getWOTDWord();
  await fetchAndRenderWOTD(word);
}

async function fetchAndRenderWOTD(word) {
  showWOTDLoading(true);

  // Step 1: Free Dictionary API — phonetic, pos, AND real definition
  let phonetic = '', audioUrl = '', pos = 'adjective', meaning = '', example = '';
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), { signal: ctrl.signal });
    if (res.ok) {
      const data = await res.json();
      const entry = data[0];
      (entry.phonetics || []).forEach(ph => {
        if (!phonetic && ph.text)  phonetic = ph.text;
        if (!audioUrl && ph.audio) audioUrl = ph.audio.startsWith('//') ? 'https:' + ph.audio : ph.audio;
      });
      const firstMeaning = entry.meanings && entry.meanings[0];
      if (firstMeaning) {
        pos = firstMeaning.partOfSpeech || pos;
        const firstDef = firstMeaning.definitions && firstMeaning.definitions[0];
        if (firstDef) {
          meaning = firstDef.definition || '';
          example = firstDef.example   || '';
        }
      }
    }
  } catch {}

  // Step 2: Datamuse API — backup definition if dictionary API gave nothing
  if (!meaning) {
    try {
      const ctrl2 = new AbortController();
      setTimeout(() => ctrl2.abort(), 4000);
      const r2 = await fetch('https://api.datamuse.com/words?sp=' + encodeURIComponent(word) + '&md=d&max=1', { signal: ctrl2.signal });
      if (r2.ok) {
        const d2 = await r2.json();
        if (d2.length && d2[0].defs && d2[0].defs.length) {
          const parts = d2[0].defs[0].split('\t');
          if (parts.length >= 2) { pos = parts[0] || pos; meaning = parts[1]; }
          else meaning = d2[0].defs[0];
        }
      }
    } catch {}
  }

  // Step 3: Gemini — child-friendly rewrite + fun fact + emoji (if API key available)
  const apiKey = typeof getKey === 'function' ? getKey() : '';
  let funFact = '', emoji = WOTD_EMOJIS[word] || '📚';

  if (apiKey && apiKey.length > 10) {
    try {
      const baseDef = meaning
        ? 'Dictionary says: "' + meaning + '". Please rewrite simply for a child aged 8-12.'
        : 'Please define this word simply for a child aged 8-12.';
      const prompt = 'Word: "' + word + '". ' + baseDef + ' Return ONLY valid JSON no markdown: {"pos":"part of speech","phonetic":"/phonetic/","meaning":"simple 1-2 sentence definition","example":"fun example sentence","fun_fact":"one amazing fact a child would love","emoji":"best single emoji"}';
      const resp = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.7,maxOutputTokens:350} }) }
      );
      if (resp.ok) {
        const d = await resp.json();
        let raw = (d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0] && d.candidates[0].content.parts[0].text) || '{}';
        raw = raw.replace(/```json/gi,'').replace(/```/gi,'').trim();
        const si = raw.indexOf('{'), ei = raw.lastIndexOf('}');
        if (si >= 0 && ei > si) raw = raw.slice(si, ei+1);
        const parsed = JSON.parse(raw);
        if (parsed.meaning)  meaning  = parsed.meaning;
        if (parsed.example)  example  = parsed.example;
        if (parsed.fun_fact) funFact  = parsed.fun_fact;
        if (parsed.emoji)    emoji    = parsed.emoji;
        if (parsed.pos)      pos      = parsed.pos;
        if (parsed.phonetic && !phonetic) phonetic = parsed.phonetic;
      }
    } catch {}
  }

  // Step 4: LOCAL_DICT and last-resort fallbacks
  if (!meaning) {
    const localEntry = typeof LOCAL_DICT !== 'undefined' ? LOCAL_DICT[word.toLowerCase()] : null;
    if (localEntry) {
      meaning = localEntry.def;
      if (!example) example = localEntry.ex || '';
      pos = localEntry.pos || pos;
    } else {
      meaning = 'A great word to learn! Look it up in the Dictionary tab for a full definition.';
    }
  }
  if (!funFact) funFact = ''; // leave empty — panel hides it; Gemini will fill it when key is available

    const data = { word, phonetic, audioUrl, pos, meaning, example, funFact, emoji, date: new Date().toDateString() };
  wotdData = data;

  // Cache for today
  try { localStorage.setItem('lb_wotd', JSON.stringify(data)); } catch {}

  renderWOTD(data);
}

function renderWOTD(data) {
  showWOTDLoading(false);

  // ── Pill (always visible, meaning truncated via CSS) ──
  const wEl = document.getElementById('wotd-word');
  const mEl = document.getElementById('wotd-meaning'); // truncated in pill
  const pEl = document.getElementById('wotd-pos');
  if (wEl) { wEl.textContent = data.word; wEl.style.opacity='0'; wEl.style.transition='opacity .35s'; requestAnimationFrame(()=>wEl.style.opacity='1'); }
  if (mEl) mEl.textContent = data.meaning;
  if (pEl) pEl.textContent = data.pos;

  // ── Expanded panel ──
  const phonEl  = document.getElementById('wotd-phonetic');
  const fullEl  = document.getElementById('wotd-fullmean'); // full meaning, no truncation
  const exEl    = document.getElementById('wotd-example');
  const factEl  = document.getElementById('wotd-fact');
  const factW   = document.getElementById('wotd-fact-wrap');
  const emojiEl = document.getElementById('wotd-emoji');

  if (phonEl)  phonEl.textContent = data.phonetic || '';
  if (fullEl)  fullEl.textContent = data.meaning  || '';
  if (exEl)    exEl.textContent   = data.example  ? '"' + data.example + '"' : '';

  // Only show fun fact when it's genuinely interesting (not the generic fallback)
  const genericFacts = ['English adds about 1,000', 'keep exploring', '170,000 words'];
  const isGeneric = !data.funFact || genericFacts.some(g => data.funFact.includes(g));
  if (factEl)  factEl.textContent  = data.funFact || '';
  if (factW)   factW.style.display = isGeneric ? 'none' : '';

  if (emojiEl) emojiEl.textContent = data.emoji || '📚';

  // Hide quiz on new word
  const qw = document.getElementById('wotd-quiz-wrap');
  if (qw) qw.style.display = 'none';
  wotdQuizData = null;
}

function showWOTDLoading(show) {
  const loading = document.getElementById('wotd-loading');
  if (loading) loading.style.display = show ? '' : 'none';
  // When loading, show placeholder text in pill
  const wEl = document.getElementById('wotd-word');
  const mEl = document.getElementById('wotd-meaning');
  if (show) {
    if (wEl) wEl.textContent = '…';
    if (mEl) mEl.textContent = 'loading…';
  }
}

// ── Speak the word ──
function speakWOTD() {
  if (!wotdData) return;
  // Try audio file first, fall back to TTS
  const btn = document.getElementById('wotd-speak');
  if (wotdData.audioUrl) {
    const audio = new Audio(wotdData.audioUrl);
    audio.onplay  = () => { if (btn) btn.classList.add('playing'); };
    audio.onended = () => { if (btn) btn.classList.remove('playing'); };
    audio.onerror = () => { ttsSpeak(wotdData.word, btn); };
    audio.play().catch(() => ttsSpeak(wotdData.word, btn));
  } else {
    ttsSpeak(wotdData.word, btn);
  }
}
function ttsSpeak(word, btn) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.rate = 0.8; u.lang = 'en-US';
  u.onstart = () => { if (btn) btn.classList.add('playing'); };
  u.onend   = () => { if (btn) btn.classList.remove('playing'); };
  speechSynthesis.speak(u);
}

// ── Save to Notebook ──
function saveWOTD() {
  if (!wotdData) return;
  const btn = document.querySelector('.wotd-save');
  if (typeof saveWord === 'function') {
    saveWord(wotdData.word);
    if (btn) { btn.textContent = '✅ Saved!'; btn.style.background = '#dcfce7'; btn.style.borderColor = '#86efac'; setTimeout(() => { btn.textContent = '📒 Add to Notebook'; btn.style.background = ''; btn.style.borderColor = ''; }, 2500); }
  }
}

// ── Explore in Lesson Viewer ──
function exploreWOTD() {
  if (!wotdData) return;
  if (typeof openSubject === 'function') openSubject('lesson');
  setTimeout(() => {
    const qf = document.getElementById('q-field');
    if (qf) { qf.value = wotdData.word; }
    if (typeof lookupDictionary === 'function') lookupDictionary(wotdData.word);
    if (typeof switchTab === 'function') switchTab('dict');
  }, 150);
}

// ── Quick Quiz ──
async function quizWOTD() {
  if (!wotdData) return;
  const qw   = document.getElementById('wotd-quiz-wrap');
  const qBtn = document.querySelector('.wotd-quiz');

  // Toggle off if already open
  if (qw && qw.style.display !== 'none') { qw.style.display = 'none'; return; }
  if (qw) qw.style.display = '';

  const qEl  = document.getElementById('wotd-quiz-q');
  const opts = document.getElementById('wotd-quiz-opts');
  const fb   = document.getElementById('wotd-quiz-fb');
  if (qEl)  qEl.textContent  = '⏳ Building your quiz…';
  if (opts) opts.innerHTML   = '';
  if (fb)   fb.textContent   = '';

  const apiKey = typeof getKey === 'function' ? getKey() : '';
  if (!apiKey || apiKey.length < 10) {
    // Fallback: simple "which meaning is right" quiz using the definition
    buildFallbackQuiz();
    return;
  }

  try {
    const prompt = `Create a fun multiple-choice quiz for a child aged 8-12 about the word "${wotdData.word}".
The correct answer must test understanding of the word's meaning.
Return ONLY valid JSON (no markdown):
{"question":"…","options":["A","B","C","D"],"correct":0,"explanation":"Brief encouraging explanation"}`;
    const resp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.8,maxOutputTokens:300} }) }
    );
    if (!resp.ok) throw new Error('api');
    const d = await resp.json();
    let raw = d.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    raw = raw.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s >= 0 && e > s) raw = raw.slice(s, e+1);
    wotdQuizData = JSON.parse(raw);
    renderWOTDQuiz(wotdQuizData);
  } catch { buildFallbackQuiz(); }
}

function buildFallbackQuiz() {
  if (!wotdData) return;
  // Pick 3 distractors from the word list
  const distractors = WOTD_WORDS.filter(w => w !== wotdData.word)
    .sort(() => Math.random() - .5).slice(0, 3);
  const correct = Math.floor(Math.random() * 4);
  const options = [...distractors];
  options.splice(correct, 0, wotdData.word);
  wotdQuizData = {
    question: '🤔 Which word means: "' + wotdData.meaning.slice(0, 80) + (wotdData.meaning.length > 80 ? '…"' : '"'),
    options,
    correct,
    explanation: 'The answer is "' + wotdData.word + '" — ' + wotdData.meaning
  };
  renderWOTDQuiz(wotdQuizData);
}

function renderWOTDQuiz(quiz) {
  const qEl  = document.getElementById('wotd-quiz-q');
  const opts = document.getElementById('wotd-quiz-opts');
  const fb   = document.getElementById('wotd-quiz-fb');
  if (!qEl || !opts) return;
  if (qEl)  qEl.textContent = quiz.question || '';
  if (fb)   fb.textContent  = '';
  opts.innerHTML = (quiz.options || []).map((opt, i) =>
    `<button class="wotd-opt" onclick="answerWOTD(this,${i},${quiz.correct},'${(quiz.explanation||'').replace(/'/g,"\\'")}')">
      <strong style="margin-right:8px;color:#6366f1">${String.fromCharCode(65+i)}.</strong>${opt}
    </button>`
  ).join('');
}

function answerWOTD(btn, chosen, correct, explanation) {
  const opts = document.getElementById('wotd-quiz-opts');
  if (!opts) return;
  opts.querySelectorAll('.wotd-opt').forEach((b, i) => {
    b.disabled = true;
    if (i === correct) b.classList.add('correct');
    else if (i === chosen) b.classList.add('wrong');
  });
  const fb = document.getElementById('wotd-quiz-fb');
  if (fb) {
    const win = chosen === correct;
    fb.innerHTML = (win ? '🎉 <strong>Correct!</strong> ' : '❌ <strong>Not quite!</strong> ') + explanation;
    fb.style.color = win ? '#15803d' : '#be123c';
    // Retry button
    fb.innerHTML += '<br><button onclick="quizWOTD()" style="margin-top:8px;padding:6px 14px;background:#eef2ff;border:1.5px solid #c7d2fe;border-radius:8px;font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer;color:#4f6ef7;">🔄 Try another question</button>';
  }
}

// ── Refresh: pick a random new word (not today's default) ──
function refreshWOTD() {
  const current = wotdData?.word || '';
  let newWord;
  do { newWord = WOTD_WORDS[Math.floor(Math.random() * WOTD_WORDS.length)]; }
  while (newWord === current);
  wotdData = null;
  // Clear cache so new word is fetched fresh
  try { localStorage.removeItem('lb_wotd'); } catch {}
  fetchAndRenderWOTD(newWord);
}
