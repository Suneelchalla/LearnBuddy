/* ═══════════════════════════════════════════════
   LearnBuddy — Typing Practice Module  (typing.js)
═══════════════════════════════════════════════ */

const TYPING_KEY = 'lb_typing_progress';
let typingProgress = {};
let typingSession  = null;
let _currentTypingTab = 'overview';

// ─────────────────────────────────────────────
//  CURRICULUM  (TypingClub / Typing.com style)
// ─────────────────────────────────────────────
const TC = {
  beginner: {
    label:'🟢 Beginner', color:'#22c55e', colorDark:'#15803d', colorLight:'#dcfce7',
    desc:'Start here — home row keys, finger placement, basic words',
    lessons:[
      { id:'b1', icon:'🏠', title:'Lesson 1 — Home Row Keys',      type:'practice', time:null,
        desc:'Place fingers on ASDF JKL; — the most important keys',
        text:'asdf jkl; asdf jkl; fj fj dk dk sl sl a; a; asdf jkl; asdfjkl; jkl;asdf fj dk sl a; fjdk slaa jfkd las; asdf jkl; asdf jkl;' },
      { id:'b2', icon:'📝', title:'Lesson 2 — Home Row Words',      type:'practice', time:null,
        desc:'Type real English words using only A S D F J K L ;',
        text:'ask fall add dad had lad glad flask lass hall all fall ask glad dad lad hall glad lad fall flask glad had fall all lad add dad ask hall' },
      { id:'b3', icon:'⬆️', title:'Lesson 3 — Top Row (QWERTY)',    type:'practice', time:null,
        desc:'Stretch fingers up to reach Q W E R T Y U I O P',
        text:'quit write power tower quiet tripe tower rope quite your power write quiet tower tripe you top row power write your type quite power tower' },
      { id:'b4', icon:'⬇️', title:'Lesson 4 — Bottom Row (ZXCVB)',  type:'practice', time:null,
        desc:'Reach down for Z X C V B N M keys',
        text:'zone next cave born mix can van box zinc next cave mix can van box zone cave born mix can van box zinc next cave born mix zone' },
      { id:'b5', icon:'1️⃣', title:'Lesson 5 — Number Row',          type:'practice', time:null,
        desc:'Learn the numbers 1 2 3 4 5 6 7 8 9 0 across the top',
        text:'1 2 3 4 5 6 7 8 9 0 12 34 56 78 90 123 456 789 100 200 300 2024 1234 5678 9012 100 250 375 480 625 710 835 940' },
      { id:'b6', icon:'⬆️', title:'Lesson 6 — Shift and Capitals',   type:'practice', time:null,
        desc:'Hold Shift to type CAPITAL letters',
        text:'Hello World My Name Is India Good Day School Book Pen Apple Mango Train Water Sun Moon Star Rain Tree Bird Dog Cat' },
      { id:'b7', icon:'🔤', title:'Lesson 7 — Simple Words',         type:'practice', time:null,
        desc:'Mix of all letter keys — common short words',
        text:'the cat sat on mat big black dog ran fast over green hill the sun is bright sky blue grass soft birds sing every morning' },
      { id:'b8', icon:'⏱️', title:'Test 1 — Home Row (60s)',          type:'test',     time:60,
        desc:'1 minute timed test · target: 10 WPM · home row only',
        text:'ask fall add dad had lad glad flask lass hall all fall ask flask glad fall add dad had lad glad flash lass hall all fall ask flask glad lad lass fall hall add dad' },
      { id:'b9', icon:'⏱️', title:'Test 2 — All Letters (90s)',       type:'test',     time:90,
        desc:'90 second test · target: 15 WPM · full alphabet',
        text:'the cat sat on the mat a big black dog ran fast over the green hill the quick brown fox jumps over the lazy dog pack my box with five dozen liquor jugs' },
    ]
  },
  medium: {
    label:'🟡 Intermediate', color:'#f59e0b', colorDark:'#92400e', colorLight:'#fef3c7',
    desc:'Full sentences, punctuation, common words and speed drills',
    lessons:[
      { id:'m1', icon:'📖', title:'Lesson 1 — Simple Sentences',     type:'practice', time:null,
        desc:'Type complete sentences with capital letters and periods',
        text:'The sun rises in the east. Birds sing in the morning. Flowers bloom in spring. The river flows to the sea. Children love to play outside. Books open many doors.' },
      { id:'m2', icon:'❗', title:'Lesson 2 — Punctuation',           type:'practice', time:null,
        desc:'Master commas, periods, question marks, exclamation marks',
        text:'Hello, how are you? I am fine, thank you! What is your name? My name is Ravi. Where do you live? I live in India. Do you like reading? Yes, I love books!' },
      { id:'m3', icon:'📚', title:'Lesson 3 — Common Words',          type:'practice', time:null,
        desc:'The 50 most frequently used English words',
        text:'the and for are but not you all can had her was one our out day get has him his how man new now old see two way who boy did its let put say she too' },
      { id:'m4', icon:'⚡', title:'Lesson 4 — Speed Drill',           type:'practice', time:null,
        desc:'Repeat common words fast to build muscle memory',
        text:'the the the and and and for for for that that with with have have this this from from they they will will your your what what said said each each' },
      { id:'m5', icon:'📄', title:'Lesson 5 — Short Paragraphs',      type:'practice', time:null,
        desc:'Flowing text to build rhythm and consistency',
        text:'India is a beautiful country. It has many rivers and mountains. The Himalayas are the tallest mountains in the world. India has many festivals like Diwali and Holi.' },
      { id:'m6', icon:'🔢', title:'Lesson 6 — Numbers in Context',    type:'practice', time:null,
        desc:'Mix numbers naturally into sentences',
        text:'There are 26 letters in the alphabet. Class 5 has 30 students. I was born in 2014. Today is the 15th of August. We have 7 days in a week and 12 months in a year.' },
      { id:'m7', icon:'⏱️', title:'Test 1 — Sentences (60s)',          type:'test',     time:60,
        desc:'1 minute test · target: 25 WPM · full sentences',
        text:'The sun is bright today. I went to school in the morning. My teacher taught us about plants. We have lunch at one. After school I play cricket with my friends.' },
      { id:'m8', icon:'⏱️', title:'Test 2 — Speed Round (2 min)',      type:'test',     time:120,
        desc:'2 minute test · target: 30 WPM · paragraphs',
        text:'Learning to type fast is a very useful skill. When you type without looking at the keyboard you can focus on what you are writing. Practice every day and your speed will improve. Keep your fingers on the home row keys and always use the correct finger for each key.' },
    ]
  },
  advanced: {
    label:'🔴 Advanced', color:'#f43f5e', colorDark:'#be123c', colorLight:'#ffe4e6',
    desc:'Long passages, special characters and high speed challenges',
    lessons:[
      { id:'a1', icon:'📜', title:'Lesson 1 — Long Passage',          type:'practice', time:null,
        desc:'Type a flowing story passage without stopping',
        text:'Once upon a time in a small village near a forest there lived a young girl named Meena. She was very curious and loved to explore the woods near her home. Every morning she would wake up early and set off on a new adventure discovering the wonders of nature.' },
      { id:'a2', icon:'🔣', title:'Lesson 2 — Special Characters',    type:'practice', time:null,
        desc:'Practice @, #, $, %, &, *, (, ), -, +, =, /',
        text:'email@example.com price: $50 #learning 50% off one+one=two (hello world) name-surname a*b=ab user@gmail.com cost: $100 #coding 75% done a-b=c x*y+z total: $250' },
      { id:'a3', icon:'💻', title:'Lesson 3 — Code Patterns',         type:'practice', time:null,
        desc:'Type programming-style text with brackets and symbols',
        text:'print("Hello World") x = 10 + 5 if x > 0: print(x) name = "Ravi" age = 12 score = 95 for i in range(10): print(i) def add(a, b): return a + b' },
      { id:'a4', icon:'🎯', title:'Lesson 4 — Accuracy Drill',        type:'practice', time:null,
        desc:'Tricky words — slow down and focus on zero errors',
        text:'rhythm rhythm strength beautiful necessary accommodation particularly through comfortable environment thoughtful thoroughly separate occasionally immediately extraordinary' },
      { id:'a5', icon:'🌍', title:'Lesson 5 — India & World',          type:'practice', time:null,
        desc:'A paragraph about India for knowledge and speed',
        text:'India is the seventh largest country by area and the most populous nation in the world. It has a rich history spanning thousands of years. The Indus Valley Civilisation was one of the earliest civilisations in the world dating back to 3000 BCE.' },
      { id:'a6', icon:'⏱️', title:'Test 1 — Long Passage (2 min)',     type:'test',     time:120,
        desc:'2 minute test · target: 40 WPM',
        text:'Technology is changing the world very fast. Computers and smartphones have made our lives easier in many ways. We can communicate with people across the world instantly. Students can learn from online resources. Doctors can diagnose diseases with the help of machines.' },
      { id:'a7', icon:'🏆', title:'Champion Test (3 min)',              type:'test',     time:180,
        desc:'3 minute ultimate test · target: 45 WPM · 95% accuracy',
        text:'The history of India spans thousands of years. The Indus Valley Civilisation was one of the earliest in the world dating back to 3000 BCE. India gave the world mathematics chess yoga and zero. Great emperors like Ashoka spread Buddhism across Asia. The Mughal Empire built magnificent monuments including the Taj Mahal. India became independent on August 15 1947 after a long freedom struggle led by Mahatma Gandhi and many other brave heroes who sacrificed everything for their nation.' },
    ]
  }
};

const FINGER_COLORS = {
  a:'#f43f5e', q:'#f43f5e', z:'#f43f5e', '1':'#f43f5e',
  s:'#f97316', w:'#f97316', x:'#f97316', '2':'#f97316',
  d:'#f59e0b', e:'#f59e0b', c:'#f59e0b', '3':'#f59e0b',
  f:'#22c55e', r:'#22c55e', v:'#22c55e', '4':'#22c55e',
  t:'#22c55e', g:'#22c55e', b:'#22c55e', '5':'#22c55e',
  j:'#3b82f6', u:'#3b82f6', m:'#3b82f6', '7':'#3b82f6',
  y:'#3b82f6', h:'#3b82f6', n:'#3b82f6', '6':'#3b82f6',
  k:'#8b5cf6', i:'#8b5cf6', ',':'#8b5cf6', '8':'#8b5cf6',
  l:'#ec4899', o:'#ec4899', '.':'#ec4899', '9':'#ec4899',
  ';':'#06b6d4', p:'#06b6d4', '/':'#06b6d4', '0':'#06b6d4',
};

// ─────────────────────────────────────────────
//  INIT & ROUTING
// ─────────────────────────────────────────────
function initTyping() {
  _tpLoad();
  typingTab('overview');
}

function typingTab(tab) {
  _currentTypingTab = tab;

  // Show/hide panels using inline style (NOT relying on CSS .typing-panel rule)
  ['overview','beginner','medium','advanced','progress','session'].forEach(t => {
    const el = document.getElementById('typing-' + t);
    if (el) el.style.display = (t === tab) ? 'block' : 'none';
  });

  document.querySelectorAll('.typing-nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));

  if (typingSession && tab !== 'session') _killSession();

  if (tab === 'overview')  _renderOverview();
  if (tab === 'beginner')  _renderLevel('beginner');
  if (tab === 'medium')    _renderLevel('medium');
  if (tab === 'advanced')  _renderLevel('advanced');
  if (tab === 'progress')  _renderProgress();
  _updateSidebarBadges();
}

// ─────────────────────────────────────────────
//  OVERVIEW
// ─────────────────────────────────────────────
function _renderOverview() {
  const el = document.getElementById('typing-overview');
  if (!el) return;

  const lvs = ['beginner','medium','advanced'];
  const stats = lvs.map(lv => {
    const ls = TC[lv].lessons;
    const done = ls.filter(l => typingProgress[l.id]?.completed).length;
    return { lv, done, total:ls.length, pct:Math.round(done/ls.length*100) };
  });

  const totalDone = stats.reduce((a,s) => a+s.done, 0);
  const totalAll  = stats.reduce((a,s) => a+s.total, 0);
  const allWpms   = Object.values(typingProgress).map(p=>p.bestWpm).filter(Boolean);
  const bestWpm   = allWpms.length ? Math.max(...allWpms) : 0;
  const totalTries= Object.values(typingProgress).reduce((a,p)=>a+(p.attempts||0),0);

  let nextLesson = null;
  for (const lv of lvs) {
    for (const l of TC[lv].lessons) {
      if (!typingProgress[l.id]?.completed) { nextLesson={lv,...l}; break; }
    }
    if (nextLesson) break;
  }

  el.innerHTML = `
  <div class="typing-overview-wrap">
    <div class="typing-hero">
      <div class="typing-hero-emoji">⌨️</div>
      <div>
        <div class="typing-hero-title">Keyboard Typing Practice</div>
        <div class="typing-hero-sub">Master touch typing — from home row to champion speed, step by step!</div>
      </div>
    </div>

    <div class="typing-stats-row">
      <div class="typing-stat-card"><div class="tsc-num">${totalDone}/${totalAll}</div><div class="tsc-label">Lessons Done</div></div>
      <div class="typing-stat-card"><div class="tsc-num">${bestWpm||'—'}</div><div class="tsc-label">Best WPM</div></div>
      <div class="typing-stat-card"><div class="tsc-num">${totalTries}</div><div class="tsc-label">Total Practice</div></div>
      <div class="typing-stat-card"><div class="tsc-num">${Math.round(totalDone/totalAll*100)||0}%</div><div class="tsc-label">Complete</div></div>
    </div>

    <div class="typing-level-cards">
      ${stats.map(s => {
        const lv = TC[s.lv];
        const next = lv.lessons.find(l => !typingProgress[l.id]?.completed);
        return `
        <div class="typing-level-card" onclick="typingTab('${s.lv}')">
          <div class="tlc-header" style="background:${lv.color}">
            <div class="tlc-label">${lv.label}</div>
            <div class="tlc-pct">${s.pct}%</div>
          </div>
          <div class="tlc-body">
            <p class="tlc-desc">${lv.desc}</p>
            <div class="tlc-bar"><div class="tlc-fill" style="width:${s.pct}%;background:${lv.color}"></div></div>
            <div class="tlc-count">${s.done} of ${s.total} lessons completed</div>
            ${next ? `<div class="tlc-next">▶ Next: ${next.title}</div>` : `<div class="tlc-done">✅ All done!</div>`}
          </div>
        </div>`;
      }).join('')}
    </div>

    ${nextLesson ? `
    <div class="typing-next-up">
      <div class="tnu-label">📍 Continue where you left off</div>
      <div class="tnu-title">${nextLesson.title}</div>
      <div class="tnu-desc">${nextLesson.desc}</div>
      <button class="tnu-btn" onclick="startLesson('${nextLesson.lv}','${nextLesson.id}')">
        ${nextLesson.type==='test' ? '⏱️ Take Test' : '▶ Start Practice'}
      </button>
    </div>` : `
    <div class="typing-next-up" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:#86efac;">
      <div class="tnu-label">🏆 Achievement!</div>
      <div class="tnu-title">All lessons completed! You're a typing champion! 🎉</div>
    </div>`}

    <div class="typing-keyboard-poster">
      <div class="tkp-title">💡 Finger Placement Guide — Home Row</div>
      <div class="tkp-wrap">
        <div class="tkp-row">
          ${['A','S','D','F','G','H','J','K','L',';'].map(k => {
            const c = FINGER_COLORS[k.toLowerCase()] || '#334155';
            return `<div class="tkp-key" style="background:${c}" title="${k}">${k}</div>`;
          }).join('')}
        </div>
        <div class="tkp-hint">👆 Rest your fingers here every time you start typing!</div>
        <div class="tkp-fingers">
          <span>🤚 Left: <strong style="color:#f43f5e">A</strong> <strong style="color:#f97316">S</strong> <strong style="color:#f59e0b">D</strong> <strong style="color:#22c55e">F</strong></span>
          <span>✋ Right: <strong style="color:#3b82f6">J</strong> <strong style="color:#8b5cf6">K</strong> <strong style="color:#ec4899">L</strong> <strong style="color:#06b6d4">;</strong></span>
          <span>Thumbs: <strong>Space Bar</strong></span>
        </div>
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
//  LEVEL PAGE
// ─────────────────────────────────────────────
function _renderLevel(lv) {
  const el = document.getElementById('typing-' + lv);
  if (!el) return;
  const c = TC[lv];
  const done = c.lessons.filter(l => typingProgress[l.id]?.completed).length;

  el.innerHTML = `
  <div class="typing-level-wrap">
    <div class="tlw-header" style="border-left:5px solid ${c.color}">
      <div>
        <div class="tlw-title">${c.label}</div>
        <div class="tlw-desc">${c.desc}</div>
      </div>
      <div class="tlw-info">${done}/${c.lessons.length} done</div>
    </div>

    <div class="typing-section-list">
      ${c.lessons.map((l, idx) => {
        const p    = typingProgress[l.id] || {};
        const isDone = !!p.completed;
        const isTest = l.type === 'test';
        return `
        <div class="typing-section-item ${isDone ? 'tsi-done' : ''}" id="tsi-${l.id}">
          <div class="tsi-num">${isDone ? '✓' : idx+1}</div>
          <div class="tsi-body">
            <div class="tsi-top">
              <span class="tsi-icon">${l.icon}</span>
              <span class="tsi-title">${l.title}</span>
              <span class="tsi-badge ${isTest ? 'tsi-badge-test' : 'tsi-badge-practice'}">${isTest ? '⏱ '+l.time+'s' : 'Practice'}</span>
              ${isDone ? '<span class="tsi-badge tsi-badge-done">✅ Done</span>' : ''}
            </div>
            <div class="tsi-desc">${l.desc}</div>
            ${p.bestWpm ? `<div class="tsi-best">🏅 Best: ${p.bestWpm} WPM · ${p.bestAcc}% accuracy · ${p.attempts} attempt${p.attempts>1?'s':''}</div>` : ''}
          </div>
          <div class="tsi-right" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <button class="tsi-btn ${isTest ? 'tsi-btn-test' : 'tsi-btn-practice'}" onclick="startLesson('${lv}','${l.id}')">
              ${isDone ? '🔄 Redo' : (isTest ? '⏱️ Take Test' : '▶ Start')}
            </button>
            <label style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--text-m);cursor:pointer;white-space:nowrap;">
              <input type="checkbox" ${isDone?'checked':''} onchange="toggleDone('${l.id}','${lv}',this.checked)" style="width:14px;height:14px;cursor:pointer;">
              Mark done
            </label>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function toggleDone(id, lv, checked) {
  _tpLoad();
  if (!typingProgress[id]) typingProgress[id] = {};
  typingProgress[id].completed = checked;
  _tpSave();
  _renderLevel(lv);
  _updateSidebarBadges();
}

// ─────────────────────────────────────────────
//  SESSION — the actual typing practice
// ─────────────────────────────────────────────
function startLesson(lv, id) {
  const lesson = TC[lv].lessons.find(l => l.id === id);
  if (!lesson) return;

  // Show session panel
  ['overview','beginner','medium','advanced','progress'].forEach(t => {
    const el = document.getElementById('typing-' + t);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.typing-nav-btn').forEach(b => b.classList.remove('active'));
  const sp = document.getElementById('typing-session');
  if (sp) sp.style.display = 'block';

  typingSession = {
    lv, id, lesson,
    started: false, startTime: null,
    timerInterval: null,
    timeLeft: lesson.time,
    typed: '', errors: 0, totalTyped: 0,
    finished: false,
    target: lesson.text.trim(),
  };

  _renderSession();
}

function _renderSession() {
  const el = document.getElementById('typing-session');
  if (!el || !typingSession) return;
  const { lesson, lv } = typingSession;
  const isTest = lesson.type === 'test';
  const c = TC[lv];

  el.innerHTML = `
  <div class="tsw-wrap">
    <div class="tsw-header">
      <button class="tsw-back" onclick="_backFromSession()">← Back</button>
      <div class="tsw-info">
        <span class="tsw-lv" style="color:${c.color}">${c.label}</span>
        <span class="tsw-title">${lesson.title}</span>
      </div>
      ${isTest ? `
      <div class="tsw-timer" id="tsw-timer">
        <span class="tsw-timer-icon">⏱️</span>
        <span id="tsw-time-val">${_fmtTime(lesson.time)}</span>
      </div>` : `<div></div>`}
    </div>

    <div class="tsw-stats">
      <div class="tsw-stat"><span class="tsw-stat-val" id="ts-wpm">0</span><span class="tsw-stat-lbl">WPM</span></div>
      <div class="tsw-stat"><span class="tsw-stat-val" id="ts-acc">100</span><span class="tsw-stat-lbl">% Acc</span></div>
      <div class="tsw-stat"><span class="tsw-stat-val" id="ts-chars">0</span><span class="tsw-stat-lbl">Chars</span></div>
      <div class="tsw-stat"><span class="tsw-stat-val" id="ts-errors">0</span><span class="tsw-stat-lbl">Errors</span></div>
    </div>

    <div class="tsw-instr">
      ${isTest
        ? `⏱️ <strong>Timed Test — ${lesson.time}s.</strong> ${lesson.desc}. Timer starts when you begin typing!`
        : `✍️ <strong>Practice Mode</strong> — ${lesson.desc}. Start typing in the box below. Try not to look at the keyboard!`
      }
    </div>

    <div class="tsw-textbox" id="tsw-textbox">${_buildDisplay(typingSession.target, 0, '')}</div>

    <textarea
      id="tsw-input"
      class="tsw-input"
      placeholder="Click here and start typing…"
      autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
      oninput="_onTypingInput(event)"
      onkeydown="_onTypingKeydown(event)"
    ></textarea>

    <div class="vkb-outer" id="tsw-vkb">${_buildVKB()}</div>

    <div id="tsw-result" style="display:none"></div>
  </div>`;

  setTimeout(() => {
    const inp = document.getElementById('tsw-input');
    if (inp) inp.focus();
  }, 80);
  _highlightKey(typingSession.target[0] || '');
}

function _onTypingInput(e) {
  const val = e.target.value;
  if (!typingSession || typingSession.finished) return;

  if (!typingSession.started) {
    typingSession.started = true;
    typingSession.startTime = Date.now();
    if (typingSession.lesson.type === 'test') _startTimer();
    const timerEl = document.getElementById('tsw-timer');
    if (timerEl) timerEl.classList.add('running');
  }

  typingSession.typed = val;
  typingSession.totalTyped = val.length;

  let errs = 0;
  for (let i = 0; i < val.length; i++) {
    if (val[i] !== typingSession.target[i]) errs++;
  }
  typingSession.errors = errs;

  const tb = document.getElementById('tsw-textbox');
  if (tb) tb.innerHTML = _buildDisplay(typingSession.target, val.length, val);

  _highlightKey(typingSession.target[val.length] || '');
  _updateStats();

  if (val.length >= typingSession.target.length) _finish(true);
}

function _onTypingKeydown(e) {
  if (e.key === 'Tab') e.preventDefault();
}

function _startTimer() {
  typingSession.timerInterval = setInterval(() => {
    if (!typingSession || typingSession.finished) return;
    const elapsed = Math.floor((Date.now() - typingSession.startTime) / 1000);
    typingSession.timeLeft = typingSession.lesson.time - elapsed;
    const d = document.getElementById('tsw-time-val');
    if (d) {
      d.textContent = _fmtTime(Math.max(0, typingSession.timeLeft));
      d.style.color = typingSession.timeLeft <= 10 ? '#f43f5e' : typingSession.timeLeft <= 30 ? '#f59e0b' : '';
    }
    if (typingSession.timeLeft <= 0) _finish(false);
  }, 500);
}

function _updateStats() {
  if (!typingSession?.startTime) return;
  const mins  = (Date.now() - typingSession.startTime) / 60000;
  const wpm   = mins > 0 ? Math.round((typingSession.totalTyped / 5) / mins) : 0;
  const correct = typingSession.totalTyped - typingSession.errors;
  const acc   = typingSession.totalTyped > 0 ? Math.round(correct / typingSession.totalTyped * 100) : 100;

  const wEl = document.getElementById('ts-wpm');
  const aEl = document.getElementById('ts-acc');
  const cEl = document.getElementById('ts-chars');
  const eEl = document.getElementById('ts-errors');
  if (wEl) wEl.textContent = wpm;
  if (aEl) { aEl.textContent = acc; aEl.style.color = acc >= 90 ? '#22c55e' : acc >= 75 ? '#f59e0b' : '#f43f5e'; }
  if (cEl) cEl.textContent = typingSession.totalTyped;
  if (eEl) { eEl.textContent = typingSession.errors; eEl.style.color = typingSession.errors > 0 ? '#f43f5e' : '#22c55e'; }
}

function _finish(completed) {
  if (!typingSession || typingSession.finished) return;
  typingSession.finished = true;
  if (typingSession.timerInterval) clearInterval(typingSession.timerInterval);

  const inp = document.getElementById('tsw-input');
  if (inp) { inp.disabled = true; }

  const mins    = typingSession.startTime ? (Date.now() - typingSession.startTime) / 60000 : 1;
  const typed   = Math.max(typingSession.totalTyped, 1);
  const wpm     = Math.round((typed / 5) / Math.max(mins, 0.01));
  const correct = typed - typingSession.errors;
  const acc     = Math.round(correct / typed * 100);
  const secs    = typingSession.startTime ? Math.round((Date.now() - typingSession.startTime) / 1000) : 0;

  _tpLoad();
  const ex = typingProgress[typingSession.id] || {};
  typingProgress[typingSession.id] = {
    completed: completed || !!ex.completed,
    bestWpm:   Math.max(wpm, ex.bestWpm || 0),
    bestAcc:   Math.max(acc, ex.bestAcc || 0),
    attempts:  (ex.attempts || 0) + 1,
    lastDate:  new Date().toDateString(),
  };
  _tpSave();
  _updateSidebarBadges();

  const isTest = typingSession.lesson.type === 'test';
  const emoji  = completed ? (acc >= 90 ? '🏆' : acc >= 75 ? '🎉' : '👍') : '⏱️';
  const msg    = completed ? (acc >= 90 ? 'Excellent work!' : acc >= 75 ? 'Good job!' : 'Keep practising!') : "Time's up!";

  const rEl = document.getElementById('tsw-result');
  if (rEl) {
    rEl.style.display = 'block';
    rEl.className = 'tsw-result ' + (acc >= 70 ? 'pass' : 'retry');
    rEl.innerHTML = `
      <div class="trc-emoji">${emoji}</div>
      <div class="trc-title">${msg}</div>
      <div class="trc-grid">
        <div class="trc-cell"><span>${wpm}</span><small>WPM</small></div>
        <div class="trc-cell"><span>${acc}%</span><small>Accuracy</small></div>
        <div class="trc-cell"><span>${typed}</span><small>Chars</small></div>
        <div class="trc-cell"><span>${secs}s</span><small>Time</small></div>
      </div>
      ${isTest ? `<div class="trc-grade">${acc>=95?'⭐⭐⭐ Star performance!':acc>=80?'⭐⭐ Great work!':acc>=70?'⭐ Pass':'📖 Keep practising'}</div>` : ''}
      <div class="trc-actions">
        <button class="trc-btn trc-btn-retry" onclick="startLesson('${typingSession.lv}','${typingSession.id}')">🔄 Try Again</button>
        <button class="trc-btn trc-btn-back"  onclick="typingTab('${typingSession.lv}')">📋 Back to Lessons</button>
      </div>
      ${!typingProgress[typingSession.id]?.completed
        ? `<button class="trc-markdone" onclick="_markDone('${typingSession.id}','${typingSession.lv}',this)">✅ Mark as Completed</button>`
        : `<div class="trc-done-badge">✅ Marked as Completed</div>`
      }`;
    rEl.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
}

function _markDone(id, lv, btn) {
  _tpLoad();
  if (!typingProgress[id]) typingProgress[id] = {};
  typingProgress[id].completed = true;
  _tpSave();
  _updateSidebarBadges();
  btn.outerHTML = '<div class="trc-done-badge">✅ Marked as Completed</div>';
}

function _backFromSession() {
  _killSession();
  typingTab(_currentTypingTab === 'session' ? 'overview' : _currentTypingTab);
}

function _killSession() {
  if (typingSession?.timerInterval) clearInterval(typingSession.timerInterval);
  typingSession = null;
}

// ─────────────────────────────────────────────
//  TEXT DISPLAY
// ─────────────────────────────────────────────
function _buildDisplay(target, len, typed) {
  let h = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i] === ' ' ? '&nbsp;' : _esc(target[i]);
    if (i < len) {
      h += `<span class="${typed[i]===target[i]?'tc-ok':'tc-err'}">${ch}</span>`;
    } else if (i === len) {
      h += `<span class="tc-cur">${ch}</span>`;
    } else {
      h += `<span class="tc-todo">${ch}</span>`;
    }
  }
  return h;
}
function _esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ─────────────────────────────────────────────
//  VIRTUAL KEYBOARD
// ─────────────────────────────────────────────
const KB = [
  ['`','1','2','3','4','5','6','7','8','9','0','-','=','⌫'],
  ['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
  ['Caps','a','s','d','f','g','h','j','k','l',';',"'",'Enter'],
  ['Shift','z','x','c','v','b','n','m',',','.','/','Shift'],
  ['Space'],
];
const HOME_KEYS = new Set(['a','s','d','f','j','k','l',';']);

function _buildVKB() {
  return KB.map(row => `
    <div class="vkb-row">
      ${row.map(k => {
        const lower = k.toLowerCase();
        const bg = FINGER_COLORS[lower] || '';
        const isSpec = k.length > 1;
        const isHome = HOME_KEYS.has(lower);
        const id = 'vk-' + k.replace(/[^a-zA-Z0-9]/g,'_');
        return `<div class="vkb-key${isSpec?' special':''}${isHome?' home-key':''}"
          id="${id}" data-key="${k}"
          style="${bg?'--kc:'+bg+';background:'+bg:''}">${k==='Space'?'Space Bar':k}</div>`;
      }).join('')}
    </div>`).join('') +
  `<div class="vkb-legend">
    <span style="background:#f43f5e">Left Pinky</span>
    <span style="background:#f97316">Left Ring</span>
    <span style="background:#f59e0b">Left Middle</span>
    <span style="background:#22c55e">Left Index</span>
    <span style="background:#3b82f6">Right Index</span>
    <span style="background:#8b5cf6">Right Middle</span>
    <span style="background:#ec4899">Right Ring</span>
    <span style="background:#06b6d4">Right Pinky</span>
  </div>`;
}

function _highlightKey(char) {
  document.querySelectorAll('#tsw-vkb .vkb-key.vk-active')
    .forEach(k => k.classList.remove('vk-active'));
  if (!char) return;
  if (char === ' ') {
    const sp = document.querySelector('#tsw-vkb [data-key="Space"]');
    if (sp) sp.classList.add('vk-active');
    return;
  }
  const lower = char.toLowerCase();
  document.querySelectorAll('#tsw-vkb .vkb-key').forEach(k => {
    if (k.dataset.key && k.dataset.key.toLowerCase() === lower)
      k.classList.add('vk-active');
  });
}

// ─────────────────────────────────────────────
//  PROGRESS PAGE
// ─────────────────────────────────────────────
function _renderProgress() {
  const el = document.getElementById('typing-progress');
  if (!el) return;

  const all = ['beginner','medium','advanced'].flatMap(lv =>
    TC[lv].lessons.map(l => ({...l, lv}))
  );
  const done  = all.filter(l => typingProgress[l.id]?.completed);
  const tests = all.filter(l => l.type==='test' && typingProgress[l.id]?.attempts > 0);
  const wpms  = Object.values(typingProgress).map(p=>p.bestWpm).filter(Boolean);
  const best  = wpms.length ? Math.max(...wpms) : 0;
  const avg   = wpms.length ? Math.round(wpms.reduce((a,b)=>a+b,0)/wpms.length) : 0;

  el.innerHTML = `
  <div class="tpw-wrap">
    <div class="tpw-title">📊 My Typing Progress</div>

    <div class="tpw-cards">
      <div class="tpw-card blue">  <div class="tpw-n">${done.length}</div><div class="tpw-l">Lessons Done</div></div>
      <div class="tpw-card green"> <div class="tpw-n">${best||'—'}</div>  <div class="tpw-l">Best WPM</div></div>
      <div class="tpw-card amber"> <div class="tpw-n">${avg||'—'}</div>   <div class="tpw-l">Avg WPM</div></div>
      <div class="tpw-card purple"><div class="tpw-n">${tests.length}</div><div class="tpw-l">Tests Taken</div></div>
    </div>

    ${['beginner','medium','advanced'].map(lv => {
      const c = TC[lv];
      const d = c.lessons.filter(l=>typingProgress[l.id]?.completed).length;
      const pct = Math.round(d/c.lessons.length*100);
      return `
      <div class="tpw-lvrow">
        <div class="tpw-lvlabel">${c.label}</div>
        <div class="tpw-lvbar"><div class="tpw-lvfill" style="width:${pct}%;background:${c.color}"></div></div>
        <div class="tpw-lvpct">${d}/${c.lessons.length}</div>
      </div>`;
    }).join('')}

    <div class="tpw-sub">📋 Test Results</div>
    ${tests.length ? `
    <div class="tpw-table">
      <div class="tpw-th"><span>Lesson</span><span>Best WPM</span><span>Best Acc</span><span>Tries</span></div>
      ${tests.map(l => {
        const p = typingProgress[l.id];
        return `<div class="tpw-tr">
          <span>${l.title}</span>
          <span><strong>${p.bestWpm}</strong> WPM</span>
          <span><strong>${p.bestAcc}%</strong></span>
          <span>${p.attempts}</span>
        </div>`;
      }).join('')}
    </div>` : '<p style="color:var(--text-m);font-size:14px;padding:8px 0">No tests yet — start practising!</p>'}

    <button class="tpw-reset" onclick="_resetTyping()">🗑️ Reset All Progress</button>
  </div>`;
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function _fmtTime(s) {
  const m = Math.floor(s/60), sec = s%60;
  return m > 0 ? `${m}:${String(sec).padStart(2,'0')}` : `${sec}s`;
}
function _tpLoad() {
  try { typingProgress = JSON.parse(localStorage.getItem(TYPING_KEY)||'{}'); } catch { typingProgress={}; }
}
function _tpSave() {
  try { localStorage.setItem(TYPING_KEY, JSON.stringify(typingProgress)); } catch {}
}
function _resetTyping() {
  if (!confirm('Reset all typing progress? This cannot be undone.')) return;
  typingProgress = {}; _tpSave(); _renderProgress(); _updateSidebarBadges();
}
function _updateSidebarBadges() {
  _tpLoad();
  ['beginner','medium','advanced'].forEach(lv => {
    const el = document.getElementById('tnb-' + lv);
    if (!el) return;
    const ls = TC[lv].lessons;
    const d  = ls.filter(l => typingProgress[l.id]?.completed).length;
    el.textContent = d + '/' + ls.length;
  });
}

if (typeof VALID_SUBJECTS !== 'undefined') VALID_SUBJECTS.push('typing');
