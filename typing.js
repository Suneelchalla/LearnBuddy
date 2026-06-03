/* ═══════════════════════════════════════════════
   LearnBuddy — Keyboard Typing Module
   typing.js — All logic for the Typing workspace
═══════════════════════════════════════════════ */

// ── STATE ────────────────────────────────────
const TYPING_STORAGE_KEY = 'lb_typing_progress';
let typingProgress = {}; // { lessonId: { completed, bestWpm, bestAcc, attempts } }
let typingSession  = null; // active practice/test session

// ── CURRICULUM DATA ─────────────────────────
const TYPING_CURRICULUM = {
  beginner: {
    label: '🟢 Beginner',
    color: '#22c55e',
    colorLight: '#dcfce7',
    desc: 'Home row keys, fingers on ASDF JKL;, build muscle memory',
    sections: [
      {
        id: 'b-homerow',
        title: '🏠 Home Row Keys',
        type: 'practice',
        icon: '🖐️',
        desc: 'Learn where to place your fingers: A S D F — J K L ;',
        content: 'asdf jkl; asdf jkl; asdfjkl; jkl;asdf fj fj dk dk sl sl a; a; fjdksla; asdf jkl; sad flask glad flash ask glad lad lass fall hall all fall dad sad add',
      },
      {
        id: 'b-homerow2',
        title: '🔤 Home Row Words',
        type: 'practice',
        icon: '📝',
        desc: 'Type real words using only home row keys',
        content: 'ask fall add dad had jal lad glad flash flask lass hall all fall ask flask glad lad lass fall hall all fall dad sad add ask fall add dad had lad glad',
      },
      {
        id: 'b-toprow',
        title: '⬆️ Top Row Keys',
        type: 'practice',
        icon: '🔝',
        desc: 'Add Q W E R T — Y U I O P to your fingers',
        content: 'qwerty uiop qwerty uiop we you top row quit tower power write quip type power tower quiet write your power quite tower rope tripe write power quit quite',
      },
      {
        id: 'b-bottomrow',
        title: '⬇️ Bottom Row Keys',
        type: 'practice',
        icon: '👇',
        desc: 'Add Z X C V B — N M to complete the alphabet',
        content: 'zxcv bnm zxcv bnm zone next cave born mix can van box zinc next cave born mix can van box zinc next cave born mix can van box zone next cave',
      },
      {
        id: 'b-numbers',
        title: '🔢 Number Row',
        type: 'practice',
        icon: '1️⃣',
        desc: 'Practice the number keys 1 2 3 4 5 6 7 8 9 0',
        content: '1 2 3 4 5 6 7 8 9 0 12 34 56 78 90 123 456 789 100 200 300 400 500 2024 1234 5678 9012 100 250 375 480 625 710 835 940',
      },
      {
        id: 'b-caps',
        title: '⬆️ Shift & Capital Letters',
        type: 'practice',
        icon: '🔡',
        desc: 'Use Shift key to type capital letters',
        content: 'Hello World My Name Is A Good Day The Sun Shines Cat Dog Tree School Book Pen Hello Class India Apple Mango Train Water Fire Earth Sky Wind Rain',
      },
      {
        id: 'b-test1',
        title: '📋 Test 1 — Home Row',
        type: 'test',
        icon: '⏱️',
        timeLimit: 60,
        desc: '1 minute timed test on home row keys. Target: 10 WPM',
        content: 'ask fall add dad had lad glad flash flask lass hall all fall ask flask glad fall add dad had lad glad flash flask lass hall all fall ask flask glad lad lass fall hall',
      },
      {
        id: 'b-test2',
        title: '📋 Test 2 — Full Alphabet',
        type: 'test',
        icon: '⏱️',
        timeLimit: 90,
        desc: '90 second test on all letter keys. Target: 15 WPM',
        content: 'the cat sat on the mat a big black dog ran fast over the green hill the quick brown fox jumps over the lazy dog pack my box with five dozen liquor jugs',
      },
      {
        id: 'b-test3',
        title: '📋 Test 3 — Numbers & Letters',
        type: 'test',
        icon: '⏱️',
        timeLimit: 90,
        desc: '90 second mixed test. Target: 15 WPM',
        content: 'there are 26 letters in the english alphabet class 5 has 30 students my phone number is 9876543210 i was born in 2015 today is a good day to learn typing in 2024',
      },
    ]
  },

  medium: {
    label: '🟡 Intermediate',
    color: '#f59e0b',
    colorLight: '#fef3c7',
    desc: 'Full sentences, punctuation, speed drills, common words',
    sections: [
      {
        id: 'm-sentences',
        title: '📖 Simple Sentences',
        type: 'practice',
        icon: '✍️',
        desc: 'Type complete sentences with correct punctuation',
        content: 'The sun rises in the east. Birds sing in the morning. Flowers bloom in spring. The river flows to the sea. Children love to play outside. Books open many doors. Hard work always pays off. Learn something new every day.',
      },
      {
        id: 'm-punctuation',
        title: '✳️ Punctuation Keys',
        type: 'practice',
        icon: '❗',
        desc: 'Master commas, periods, question marks and more',
        content: 'Hello, how are you? I am fine, thank you! What is your name? My name is Ravi. Where do you live? I live in India. Do you like reading? Yes, I love reading books! Can you come today? No, I am busy.',
      },
      {
        id: 'm-commonwords',
        title: '📚 100 Most Common Words',
        type: 'practice',
        icon: '🔤',
        desc: 'Practice the most frequently used English words',
        content: 'the and for are but not you all can had her was one our out day get has him his how man new now old see two way who boy did its let put say she too use',
      },
      {
        id: 'm-speed',
        title: '⚡ Speed Drill',
        type: 'practice',
        icon: '🚀',
        desc: 'Short bursts of fast typing to build finger speed',
        content: 'the the the and and and for for for that that that with with with have have have this this this from from from they they they will will will your your your',
      },
      {
        id: 'm-paragraphs',
        title: '📄 Short Paragraphs',
        type: 'practice',
        icon: '📃',
        desc: 'Type flowing paragraphs to build rhythm',
        content: 'India is a beautiful country. It has many rivers and mountains. The Himalayas are the tallest mountains in the world. The Ganga is a sacred river. India has many festivals like Diwali and Holi. People of different religions live here in harmony.',
      },
      {
        id: 'm-test1',
        title: '📋 Test 1 — Sentences',
        type: 'test',
        icon: '⏱️',
        timeLimit: 60,
        desc: '1 minute test on full sentences. Target: 25 WPM',
        content: 'The sun is bright today. I went to school in the morning. My teacher taught us about plants. We have lunch at one o clock. After school I play cricket with my friends. Reading books makes us smart.',
      },
      {
        id: 'm-test2',
        title: '📋 Test 2 — Punctuation',
        type: 'test',
        icon: '⏱️',
        timeLimit: 90,
        desc: '90 second test with punctuation. Target: 25 WPM',
        content: 'What is the capital of India? New Delhi is the capital. Who was the first Prime Minister? Jawaharlal Nehru was the first Prime Minister. India got independence in 1947. We celebrate Independence Day on August 15.',
      },
      {
        id: 'm-test3',
        title: '📋 Test 3 — Speed Round',
        type: 'test',
        icon: '⏱️',
        timeLimit: 120,
        desc: '2 minute speed test. Target: 30 WPM',
        content: 'Learning to type fast is a very useful skill. When you type without looking at the keyboard you can focus on what you are writing. Practice every day and your speed will improve. Keep your fingers on the home row keys and always use the correct finger for each key.',
      },
    ]
  },

  advanced: {
    label: '🔴 Advanced',
    color: '#f43f5e',
    colorLight: '#ffe4e6',
    desc: 'Long passages, special characters, high speed challenges',
    sections: [
      {
        id: 'a-longtext',
        title: '📜 Long Passages',
        type: 'practice',
        icon: '📖',
        desc: 'Type long paragraphs without stopping',
        content: 'Once upon a time in a small village near a forest, there lived a young girl named Meena. She was very curious and loved to explore the woods near her home. Every morning she would wake up early, pack a small bag with some food and water, and set off on a new adventure. One day she discovered a hidden lake that nobody in the village knew about. The water was crystal clear and she could see tiny fish swimming near the surface.',
      },
      {
        id: 'a-special',
        title: '🔣 Special Characters',
        type: 'practice',
        icon: '⌨️',
        desc: 'Practice @, #, $, %, &, *, (, ), -, +, =',
        content: 'email@example.com price: $50 #learning 50% off one+one=two (hello world) name-surname a*b = ab user@gmail.com cost: $100 #coding 75% done hello@world.com a-b=c x*y+z',
      },
      {
        id: 'a-coding',
        title: '💻 Code Typing',
        type: 'practice',
        icon: '🖥️',
        desc: 'Type code-like patterns with brackets and symbols',
        content: 'print("Hello World") x = 10 + 5 if x > 0: print(x) def add(a, b): return a + b for i in range(10): print(i) name = "Ravi" age = 12 score = 95',
      },
      {
        id: 'a-accuracy',
        title: '🎯 Accuracy Drill',
        type: 'practice',
        icon: '🏹',
        desc: 'Tricky letter combinations — focus on zero errors',
        content: 'rhythm rhythm rhythm strength strength strength through through through beautiful beautiful beautiful necessary necessary necessary accommodation accommodation particularly particularly particularly',
      },
      {
        id: 'a-test1',
        title: '📋 Test 1 — Long Passage',
        type: 'test',
        icon: '⏱️',
        timeLimit: 120,
        desc: '2 minute passage test. Target: 40 WPM',
        content: 'Technology is changing the world very fast. Computers and smartphones have made our lives easier in many ways. We can communicate with people across the world instantly. Students can learn from online resources. Doctors can diagnose diseases with the help of machines. However we must use technology wisely and not become dependent on it for everything.',
      },
      {
        id: 'a-test2',
        title: '📋 Test 2 — Special Characters',
        type: 'test',
        icon: '⏱️',
        timeLimit: 90,
        desc: '90 second test with symbols and numbers. Target: 35 WPM',
        content: 'The price is $25.00 and the discount is 10%. Call us at +91-9876543210 or email info@learnbuddy.com. Use code LEARN50 for 50% off! Total items: 5 + 3 = 8. Reference #2024-LB.',
      },
      {
        id: 'a-test3',
        title: '📋 Champion Test 🏆',
        type: 'test',
        icon: '🏆',
        timeLimit: 180,
        desc: '3 minute ultimate test. Target: 45 WPM, 95% accuracy',
        content: 'The history of India spans thousands of years. The Indus Valley Civilisation was one of the earliest in the world, dating back to 3000 BCE. India gave the world mathematics, chess, yoga, and zero. Great emperors like Ashoka spread Buddhism across Asia. The Mughal Empire built magnificent monuments including the Taj Mahal. In modern times, India became independent on August 15, 1947 after a long freedom struggle led by Mahatma Gandhi and many other brave heroes.',
      },
    ]
  }
};

// ─────────────────────────────────────────────
//  INIT & NAVIGATION
// ─────────────────────────────────────────────
function initTyping() {
  loadTypingProgress();
  typingTab('overview');
}

function typingTab(tab) {
  // Hide all panels
  document.querySelectorAll('.typing-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.typing-nav-btn').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('typing-' + tab);
  const btn   = document.getElementById('tnav-' + tab);
  if (panel) panel.style.display = '';
  if (btn)   btn.classList.add('active');

  if (tab === 'overview')   renderTypingOverview();
  if (tab === 'beginner')   renderTypingLevel('beginner');
  if (tab === 'medium')     renderTypingLevel('medium');
  if (tab === 'advanced')   renderTypingLevel('advanced');
  if (tab === 'progress')   renderTypingProgressPage();

  // If there's an active session, stop it when navigating away
  if (typingSession && tab !== 'session') endTypingSession(false);
}

// ─────────────────────────────────────────────
//  OVERVIEW PAGE
// ─────────────────────────────────────────────
function renderTypingOverview() {
  const el = document.getElementById('typing-overview');
  if (!el) return;

  const levels = ['beginner','medium','advanced'];
  const stats = levels.map(lv => {
    const sections = TYPING_CURRICULUM[lv].sections;
    const done = sections.filter(s => typingProgress[s.id]?.completed).length;
    return { lv, done, total: sections.length, pct: Math.round(done/sections.length*100) };
  });

  const totalDone  = stats.reduce((a,s) => a + s.done, 0);
  const totalAll   = stats.reduce((a,s) => a + s.total, 0);
  const allWpms    = Object.values(typingProgress).map(p => p.bestWpm).filter(Boolean);
  const bestWpm    = allWpms.length ? Math.max(...allWpms) : 0;
  const totalAttempts = Object.values(typingProgress).reduce((a,p) => a + (p.attempts||0), 0);

  // Find next recommended lesson
  let nextLesson = null;
  for (const lv of levels) {
    for (const s of TYPING_CURRICULUM[lv].sections) {
      if (!typingProgress[s.id]?.completed) { nextLesson = { lv, ...s }; break; }
    }
    if (nextLesson) break;
  }

  el.innerHTML = `
    <div class="typing-overview-wrap">
      <!-- Hero banner -->
      <div class="typing-hero">
        <div class="typing-hero-emoji">⌨️</div>
        <div class="typing-hero-text">
          <h2 class="typing-hero-title">Keyboard Typing</h2>
          <p class="typing-hero-sub">Master touch typing — from home row to champion speed!</p>
        </div>
      </div>

      <!-- Stats row -->
      <div class="typing-stats-row">
        <div class="typing-stat-card">
          <div class="tsc-num">${totalDone}/${totalAll}</div>
          <div class="tsc-label">Lessons Done</div>
        </div>
        <div class="typing-stat-card">
          <div class="tsc-num">${bestWpm || '—'}</div>
          <div class="tsc-label">Best WPM</div>
        </div>
        <div class="typing-stat-card">
          <div class="tsc-num">${totalAttempts}</div>
          <div class="tsc-label">Total Practice</div>
        </div>
        <div class="typing-stat-card">
          <div class="tsc-num">${Math.round(totalDone/totalAll*100)||0}%</div>
          <div class="tsc-label">Complete</div>
        </div>
      </div>

      <!-- Level cards -->
      <div class="typing-level-cards">
        ${stats.map(s => {
          const lv   = TYPING_CURRICULUM[s.lv];
          const next = lv.sections.find(sec => !typingProgress[sec.id]?.completed);
          return `
          <div class="typing-level-card" onclick="typingTab('${s.lv}')">
            <div class="tlc-header" style="background:${lv.color}">
              <div class="tlc-label">${lv.label}</div>
              <div class="tlc-pct">${s.pct}%</div>
            </div>
            <div class="tlc-body">
              <p class="tlc-desc">${lv.desc}</p>
              <div class="tlc-progress-bar"><div class="tlc-progress-fill" style="width:${s.pct}%;background:${lv.color}"></div></div>
              <div class="tlc-count">${s.done} of ${s.total} lessons completed</div>
              ${next ? `<div class="tlc-next">▶ Next: ${next.title}</div>` : `<div class="tlc-done">✅ All done!</div>`}
            </div>
          </div>`;
        }).join('')}
      </div>

      <!-- Next up recommendation -->
      ${nextLesson ? `
      <div class="typing-next-up">
        <div class="tnu-label">📍 Pick up where you left off</div>
        <div class="tnu-title">${nextLesson.title}</div>
        <div class="tnu-desc">${nextLesson.desc}</div>
        <button class="tnu-btn" onclick="startTypingLesson('${nextLesson.lv}','${nextLesson.id}')">
          ${nextLesson.type === 'test' ? '⏱️ Start Test' : '▶ Start Practice'}
        </button>
      </div>` : `
      <div class="typing-next-up" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-color:#86efac;">
        <div class="tnu-label">🏆 Congratulations!</div>
        <div class="tnu-title">You've completed all lessons!</div>
        <div class="tnu-desc">Amazing work — you're a typing champion!</div>
      </div>`}

      <!-- Keyboard poster -->
      <div class="typing-keyboard-poster">
        <div class="tkp-title">💡 Finger Placement Guide</div>
        ${renderKeyboardDiagram()}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
//  LEVEL PAGE  (beginner / medium / advanced)
// ─────────────────────────────────────────────
function renderTypingLevel(lv) {
  const el = document.getElementById('typing-' + lv);
  if (!el) return;
  const curriculum = TYPING_CURRICULUM[lv];
  const sections   = curriculum.sections;

  el.innerHTML = `
    <div class="typing-level-wrap">
      <div class="tlw-header" style="border-left:5px solid ${curriculum.color}">
        <div>
          <div class="tlw-title">${curriculum.label}</div>
          <div class="tlw-desc">${curriculum.desc}</div>
        </div>
        <div class="tlw-progress-info">
          ${sections.filter(s => typingProgress[s.id]?.completed).length}/${sections.length} done
        </div>
      </div>

      <div class="typing-section-list">
        ${sections.map((section, idx) => {
          const prog = typingProgress[section.id] || {};
          const done = !!prog.completed;
          const isTest = section.type === 'test';
          return `
          <div class="typing-section-item ${done ? 'done' : ''}" id="tsi-${section.id}">
            <div class="tsi-left">
              <div class="tsi-checkbox ${done ? 'checked' : ''}" onclick="toggleTypingComplete('${section.id}', '${lv}')" title="${done ? 'Mark incomplete' : 'Mark complete'}">
                ${done ? '✓' : ''}
              </div>
            </div>
            <div class="tsi-body">
              <div class="tsi-top">
                <span class="tsi-icon">${section.icon}</span>
                <span class="tsi-title">${section.title}</span>
                ${isTest ? `<span class="tsi-badge test">⏱ ${section.timeLimit}s</span>` : `<span class="tsi-badge practice">Practice</span>`}
                ${done ? `<span class="tsi-badge done-badge">✅ Done</span>` : ''}
              </div>
              <div class="tsi-desc">${section.desc}</div>
              ${prog.bestWpm ? `<div class="tsi-stats">Best: <strong>${prog.bestWpm} WPM</strong> · <strong>${prog.bestAcc}%</strong> accuracy · ${prog.attempts} attempt${prog.attempts>1?'s':''}</div>` : ''}
            </div>
            <div class="tsi-right">
              <button class="tsi-btn ${isTest ? 'test' : 'practice'}" onclick="startTypingLesson('${lv}','${section.id}')">
                ${done ? '🔄 Redo' : (isTest ? '⏱️ Take Test' : '▶ Practice')}
              </button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

// ─────────────────────────────────────────────
//  TOGGLE COMPLETE (checkbox)
// ─────────────────────────────────────────────
function toggleTypingComplete(id, lv) {
  loadTypingProgress();
  if (!typingProgress[id]) typingProgress[id] = {};
  typingProgress[id].completed = !typingProgress[id].completed;
  saveTypingProgress();
  renderTypingLevel(lv);
}

// ─────────────────────────────────────────────
//  SESSION — Practice & Test
// ─────────────────────────────────────────────
function startTypingLesson(lv, id) {
  const section = TYPING_CURRICULUM[lv].sections.find(s => s.id === id);
  if (!section) return;

  // Show session panel
  document.querySelectorAll('.typing-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.typing-nav-btn').forEach(b => b.classList.remove('active'));
  const sp = document.getElementById('typing-session');
  if (sp) sp.style.display = '';

  typingSession = {
    lv, id, section,
    started: false,
    startTime: null,
    timerInterval: null,
    timeLeft: section.timeLimit || null,
    input: '',
    target: section.content.trim(),
    errors: 0,
    totalTyped: 0,
    finished: false,
  };

  renderTypingSession();
}

function renderTypingSession() {
  const el = document.getElementById('typing-session');
  if (!el || !typingSession) return;
  const s = typingSession.section;
  const isTest = s.type === 'test';
  const lv = TYPING_CURRICULUM[typingSession.lv];

  el.innerHTML = `
    <div class="typing-session-wrap">
      <!-- Header -->
      <div class="tsw-header">
        <button class="tsw-back" onclick="typingSessionBack()">← Back</button>
        <div class="tsw-info">
          <span class="tsw-level" style="color:${lv.color}">${lv.label}</span>
          <span class="tsw-title">${s.title}</span>
        </div>
        ${isTest ? `
        <div class="tsw-timer ${typingSession.started ? 'running' : ''}" id="tsw-timer">
          <span class="tsw-timer-icon">⏱️</span>
          <span id="tsw-time-display">${formatTime(s.timeLimit)}</span>
        </div>` : `<div></div>`}
      </div>

      <!-- Live stats bar -->
      <div class="tsw-stats-bar">
        <div class="tsw-stat"><span class="tsw-stat-n" id="tstat-wpm">0</span><span class="tsw-stat-l">WPM</span></div>
        <div class="tsw-stat"><span class="tsw-stat-n" id="tstat-acc">100</span><span class="tsw-stat-l">% Acc</span></div>
        <div class="tsw-stat"><span class="tsw-stat-n" id="tstat-chars">0</span><span class="tsw-stat-l">Chars</span></div>
        <div class="tsw-stat"><span class="tsw-stat-n" id="tstat-errors">0</span><span class="tsw-stat-l">Errors</span></div>
      </div>

      <!-- Instruction -->
      <div class="tsw-instruction">
        ${isTest
          ? `⏱️ Timed Test — ${s.timeLimit}s · ${s.desc} · Press any key to <strong>start the timer</strong>`
          : `✍️ Practice Mode — Type the text below. Press any key to begin.`
        }
      </div>

      <!-- Target text display -->
      <div class="tsw-text-display" id="tsw-text-display">
        ${buildTextDisplay(typingSession.target, 0)}
      </div>

      <!-- Input area -->
      <textarea
        class="tsw-input"
        id="tsw-input"
        placeholder="Start typing here…"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        oninput="onTypingInput(event)"
        onkeydown="onTypingKeydown(event)"
      ></textarea>

      <!-- Virtual keyboard -->
      <div class="tsw-keyboard" id="tsw-keyboard">
        ${renderVirtualKeyboard()}
      </div>

      <!-- Result panel (hidden until done) -->
      <div id="tsw-result" style="display:none"></div>
    </div>`;

  // Focus input
  setTimeout(() => {
    const inp = document.getElementById('tsw-input');
    if (inp) inp.focus();
  }, 100);
}

// ─────────────────────────────────────────────
//  TYPING INPUT HANDLER
// ─────────────────────────────────────────────
function onTypingInput(e) {
  const inp = e.target;
  const val = inp.value;
  if (!typingSession || typingSession.finished) return;

  // Start timer on first keystroke
  if (!typingSession.started) {
    typingSession.started = true;
    typingSession.startTime = Date.now();
    if (typingSession.section.type === 'test') startTypingTimer();
    const timerEl = document.getElementById('tsw-timer');
    if (timerEl) timerEl.classList.add('running');
  }

  typingSession.input = val;
  typingSession.totalTyped = val.length;

  // Count errors
  let errors = 0;
  for (let i = 0; i < val.length; i++) {
    if (val[i] !== typingSession.target[i]) errors++;
  }
  typingSession.errors = errors;

  // Update display
  const displayEl = document.getElementById('tsw-text-display');
  if (displayEl) displayEl.innerHTML = buildTextDisplay(typingSession.target, val.length, val);

  // Highlight active key on virtual keyboard
  const nextChar = typingSession.target[val.length] || '';
  highlightKey(nextChar);

  // Update live stats
  updateTypingStats();

  // Check completion
  if (val.length >= typingSession.target.length) {
    finishTypingSession(true);
  }
}

function onTypingKeydown(e) {
  // Prevent Tab from leaving the textarea
  if (e.key === 'Tab') { e.preventDefault(); }
}

function startTypingTimer() {
  typingSession.timerInterval = setInterval(() => {
    if (!typingSession || typingSession.finished) return;
    const elapsed = Math.floor((Date.now() - typingSession.startTime) / 1000);
    typingSession.timeLeft = typingSession.section.timeLimit - elapsed;
    const disp = document.getElementById('tsw-time-display');
    if (disp) {
      disp.textContent = formatTime(Math.max(0, typingSession.timeLeft));
      if (typingSession.timeLeft <= 10) disp.style.color = '#f43f5e';
      else if (typingSession.timeLeft <= 30) disp.style.color = '#f59e0b';
    }
    if (typingSession.timeLeft <= 0) finishTypingSession(false);
  }, 500);
}

function updateTypingStats() {
  if (!typingSession || !typingSession.startTime) return;
  const elapsed = (Date.now() - typingSession.startTime) / 1000 / 60; // minutes
  const words    = typingSession.totalTyped / 5;
  const wpm      = elapsed > 0 ? Math.round(words / elapsed) : 0;
  const correct  = typingSession.totalTyped - typingSession.errors;
  const acc      = typingSession.totalTyped > 0 ? Math.round(correct / typingSession.totalTyped * 100) : 100;

  const wpmEl   = document.getElementById('tstat-wpm');
  const accEl   = document.getElementById('tstat-acc');
  const charEl  = document.getElementById('tstat-chars');
  const errEl   = document.getElementById('tstat-errors');
  if (wpmEl)  wpmEl.textContent  = wpm;
  if (accEl)  { accEl.textContent = acc; accEl.style.color = acc >= 90 ? '#22c55e' : acc >= 75 ? '#f59e0b' : '#f43f5e'; }
  if (charEl) charEl.textContent = typingSession.totalTyped;
  if (errEl)  { errEl.textContent = typingSession.errors; errEl.style.color = typingSession.errors > 0 ? '#f43f5e' : '#22c55e'; }
}

// ─────────────────────────────────────────────
//  FINISH SESSION
// ─────────────────────────────────────────────
function finishTypingSession(completed) {
  if (!typingSession || typingSession.finished) return;
  typingSession.finished = true;

  if (typingSession.timerInterval) clearInterval(typingSession.timerInterval);

  const elapsed = typingSession.startTime ? (Date.now() - typingSession.startTime) / 1000 / 60 : 1;
  const typed   = typingSession.totalTyped || 1;
  const words   = typed / 5;
  const wpm     = Math.round(words / Math.max(elapsed, 0.01));
  const correct = typed - typingSession.errors;
  const acc     = Math.round(correct / typed * 100);

  // Save progress
  loadTypingProgress();
  const existing = typingProgress[typingSession.id] || {};
  typingProgress[typingSession.id] = {
    completed: completed || existing.completed,
    bestWpm: Math.max(wpm, existing.bestWpm || 0),
    bestAcc: Math.max(acc, existing.bestAcc || 0),
    attempts: (existing.attempts || 0) + 1,
    lastDate: new Date().toDateString(),
  };
  saveTypingProgress();

  // Disable input
  const inp = document.getElementById('tsw-input');
  if (inp) { inp.disabled = true; inp.style.opacity = '0.5'; }

  // Show result
  const isTest = typingSession.section.type === 'test';
  const timeRan = typingSession.startTime ? Math.round((Date.now() - typingSession.startTime) / 1000) : 0;
  const pass    = isTest ? (wpm >= 10 && acc >= 70) : true;

  const resultEl = document.getElementById('tsw-result');
  if (resultEl) {
    resultEl.style.display = '';
    resultEl.innerHTML = `
      <div class="tsw-result-card ${pass ? 'pass' : 'retry'}">
        <div class="trc-emoji">${completed ? (acc >= 90 ? '🏆' : acc >= 75 ? '🎉' : '👍') : '⏱️'}</div>
        <div class="trc-title">${completed ? (acc >= 90 ? 'Excellent!' : acc >= 75 ? 'Good job!' : 'Keep practising!') : 'Time\'s up!'}</div>
        <div class="trc-stats-grid">
          <div class="trc-stat"><span>${wpm}</span><small>WPM</small></div>
          <div class="trc-stat"><span>${acc}%</span><small>Accuracy</small></div>
          <div class="trc-stat"><span>${typed}</span><small>Characters</small></div>
          <div class="trc-stat"><span>${timeRan}s</span><small>Time</small></div>
        </div>
        ${isTest ? `<div class="trc-grade">${acc >= 95 ? '⭐⭐⭐ Star Performance!' : acc >= 80 ? '⭐⭐ Great Work!' : acc >= 70 ? '⭐ Pass' : '📖 Need more practice'}</div>` : ''}
        <div class="trc-actions">
          <button class="trc-btn retry" onclick="startTypingLesson('${typingSession.lv}','${typingSession.id}')">🔄 Try Again</button>
          <button class="trc-btn next" onclick="typingTab('${typingSession.lv}')">📋 Back to Lessons</button>
        </div>
        ${!typingProgress[typingSession.id]?.completed ? `
        <button class="trc-mark-done" onclick="markTypingDoneFromResult('${typingSession.id}','${typingSession.lv}')">
          ✅ Mark as Completed
        </button>` : `<div class="trc-completed-badge">✅ Marked as Completed</div>`}
      </div>`;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function markTypingDoneFromResult(id, lv) {
  loadTypingProgress();
  if (!typingProgress[id]) typingProgress[id] = {};
  typingProgress[id].completed = true;
  saveTypingProgress();
  // Update button
  const btn = document.querySelector('.trc-mark-done');
  if (btn) btn.outerHTML = '<div class="trc-completed-badge">✅ Marked as Completed</div>';
}

function typingSessionBack() {
  if (typingSession?.timerInterval) clearInterval(typingSession.timerInterval);
  typingSession = null;
  typingTab(document.querySelector('.typing-nav-btn.active')?.dataset?.tab || 'overview');
}

// ─────────────────────────────────────────────
//  TEXT DISPLAY BUILDER
// ─────────────────────────────────────────────
function buildTextDisplay(target, typedLen, typed = '') {
  let html = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i] === ' ' ? '&nbsp;' : target[i];
    if (i < typedLen) {
      const correct = typed[i] === target[i];
      html += `<span class="tc-${correct ? 'ok' : 'err'}">${ch}</span>`;
    } else if (i === typedLen) {
      html += `<span class="tc-cursor">${ch}</span>`;
    } else {
      html += `<span class="tc-pending">${ch}</span>`;
    }
  }
  return html;
}

// ─────────────────────────────────────────────
//  VIRTUAL KEYBOARD
// ─────────────────────────────────────────────
const KB_ROWS = [
  ['`','1','2','3','4','5','6','7','8','9','0','-','=','⌫'],
  ['Tab','q','w','e','r','t','y','u','i','o','p','[',']','\\'],
  ['Caps','a','s','d','f','g','h','j','k','l',';',"'",'Enter'],
  ['Shift','z','x','c','v','b','n','m',',','.','/','Shift'],
  ['Space'],
];

const FINGER_COLORS = {
  // Left hand
  'a':'#f43f5e','q':'#f43f5e','z':'#f43f5e','1':'#f43f5e',
  's':'#f97316','w':'#f97316','x':'#f97316','2':'#f97316',
  'd':'#f59e0b','e':'#f59e0b','c':'#f59e0b','3':'#f59e0b',
  'f':'#22c55e','r':'#22c55e','v':'#22c55e','4':'#22c55e','t':'#22c55e','g':'#22c55e','b':'#22c55e','5':'#22c55e',
  // Right hand
  'j':'#3b82f6','u':'#3b82f6','m':'#3b82f6','7':'#3b82f6','y':'#3b82f6','h':'#3b82f6','n':'#3b82f6','6':'#3b82f6',
  'k':'#8b5cf6','i':'#8b5cf6',',':'#8b5cf6','8':'#8b5cf6',
  'l':'#ec4899','o':'#ec4899','.':'#ec4899','9':'#ec4899',
  ';':'#06b6d4','p':'#06b6d4','/':'#06b6d4','0':'#06b6d4',
};

function renderVirtualKeyboard() {
  return `<div class="vkb-wrap">
    ${KB_ROWS.map(row => `
    <div class="vkb-row">
      ${row.map(key => {
        const lower = key.toLowerCase();
        const color = FINGER_COLORS[lower] || '#e2e8f0';
        const isHome = 'asdf jkl;'.includes(lower) && lower.length === 1;
        const isSpecial = key.length > 1;
        return `<div class="vkb-key ${isSpecial ? 'special' : ''} ${isHome ? 'home' : ''}"
          id="vk-${key.replace(/[^a-zA-Z0-9]/g,'_')}"
          data-key="${key}"
          style="--kc:${color}">
          ${key === '⌫' ? '⌫' : key === 'Space' ? '________' : key}
        </div>`;
      }).join('')}
    </div>`).join('')}
    <div class="vkb-legend">
      <span style="background:#f43f5e">Left Pinky</span>
      <span style="background:#f97316">Left Ring</span>
      <span style="background:#f59e0b">Left Middle</span>
      <span style="background:#22c55e">Left Index</span>
      <span style="background:#3b82f6">Right Index</span>
      <span style="background:#8b5cf6">Right Middle</span>
      <span style="background:#ec4899">Right Ring</span>
      <span style="background:#06b6d4">Right Pinky</span>
    </div>
  </div>`;
}

function highlightKey(char) {
  // Remove previous highlight
  document.querySelectorAll('.vkb-key.active-key').forEach(k => k.classList.remove('active-key'));
  if (!char || char === ' ') {
    const spaceKey = document.getElementById('vk-Space');
    if (spaceKey) spaceKey.classList.add('active-key');
    return;
  }
  const lower = char.toLowerCase();
  // Find the key element
  const allKeys = document.querySelectorAll('.vkb-key');
  allKeys.forEach(k => {
    if (k.dataset.key && k.dataset.key.toLowerCase() === lower) k.classList.add('active-key');
  });
}

// ─────────────────────────────────────────────
//  KEYBOARD DIAGRAM (overview)
// ─────────────────────────────────────────────
function renderKeyboardDiagram() {
  const rows = [
    [{k:'A',f:'Left Pinky',c:'#f43f5e'},{k:'S',f:'Left Ring',c:'#f97316'},{k:'D',f:'Left Middle',c:'#f59e0b'},{k:'F',f:'Left Index',c:'#22c55e'},{k:'G',f:'Left Index',c:'#22c55e'},{k:'H',f:'Right Index',c:'#3b82f6'},{k:'J',f:'Right Index',c:'#3b82f6'},{k:'K',f:'Right Middle',c:'#8b5cf6'},{k:'L',f:'Right Ring',c:'#ec4899'},{k:';',f:'Right Pinky',c:'#06b6d4'}],
  ];
  return `<div class="tkp-diagram">
    <div class="tkp-row">
      ${rows[0].map(k => `<div class="tkp-key" style="background:${k.c}" title="${k.f}">${k.k}</div>`).join('')}
    </div>
    <div class="tkp-hint">👆 These are the <strong>home row</strong> keys — always rest your fingers here!</div>
    <div class="tkp-fingers">
      <div>🤚 Left hand: <strong style="color:#f43f5e">A</strong> <strong style="color:#f97316">S</strong> <strong style="color:#f59e0b">D</strong> <strong style="color:#22c55e">F</strong></div>
      <div>✋ Right hand: <strong style="color:#3b82f6">J</strong> <strong style="color:#8b5cf6">K</strong> <strong style="color:#ec4899">L</strong> <strong style="color:#06b6d4">;</strong></div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
//  PROGRESS PAGE
// ─────────────────────────────────────────────
function renderTypingProgressPage() {
  const el = document.getElementById('typing-progress');
  if (!el) return;

  const allSections = [
    ...TYPING_CURRICULUM.beginner.sections.map(s => ({ ...s, lv: 'beginner' })),
    ...TYPING_CURRICULUM.medium.sections.map(s => ({ ...s, lv: 'medium' })),
    ...TYPING_CURRICULUM.advanced.sections.map(s => ({ ...s, lv: 'advanced' })),
  ];

  const done       = allSections.filter(s => typingProgress[s.id]?.completed);
  const tests      = allSections.filter(s => s.type === 'test' && typingProgress[s.id]?.attempts > 0);
  const allWpms    = Object.values(typingProgress).map(p => p.bestWpm).filter(Boolean);
  const bestWpm    = allWpms.length ? Math.max(...allWpms) : 0;
  const avgWpm     = allWpms.length ? Math.round(allWpms.reduce((a,b) => a+b, 0) / allWpms.length) : 0;

  el.innerHTML = `
    <div class="typing-progress-wrap">
      <h2 class="tpw-title">📊 My Typing Progress</h2>

      <!-- Summary cards -->
      <div class="tpw-summary">
        <div class="tpw-card blue"><div class="tpw-n">${done.length}</div><div class="tpw-l">Lessons Completed</div></div>
        <div class="tpw-card green"><div class="tpw-n">${bestWpm || '—'}</div><div class="tpw-l">Best WPM</div></div>
        <div class="tpw-card amber"><div class="tpw-n">${avgWpm || '—'}</div><div class="tpw-l">Average WPM</div></div>
        <div class="tpw-card purple"><div class="tpw-n">${tests.length}</div><div class="tpw-l">Tests Taken</div></div>
      </div>

      <!-- Per-level progress bars -->
      ${['beginner','medium','advanced'].map(lv => {
        const c = TYPING_CURRICULUM[lv];
        const lvDone = c.sections.filter(s => typingProgress[s.id]?.completed).length;
        const pct = Math.round(lvDone / c.sections.length * 100);
        return `
        <div class="tpw-level-row">
          <div class="tpw-lv-label">${c.label}</div>
          <div class="tpw-lv-bar"><div class="tpw-lv-fill" style="width:${pct}%;background:${c.color}"></div></div>
          <div class="tpw-lv-pct">${lvDone}/${c.sections.length}</div>
        </div>`;
      }).join('')}

      <!-- Test history -->
      <h3 class="tpw-subtitle">📋 Test Results</h3>
      ${tests.length ? `
      <div class="tpw-test-table">
        <div class="tpw-th"><span>Lesson</span><span>Best WPM</span><span>Best Acc</span><span>Attempts</span></div>
        ${tests.map(s => {
          const p = typingProgress[s.id];
          return `<div class="tpw-tr">
            <span>${s.title}</span>
            <span><strong>${p.bestWpm}</strong> WPM</span>
            <span><strong>${p.bestAcc}%</strong></span>
            <span>${p.attempts}</span>
          </div>`;
        }).join('')}
      </div>` : '<p style="color:var(--text-m);font-size:14px;padding:12px 0">No tests taken yet — start practising!</p>'}

      <!-- Reset button -->
      <button class="tpw-reset-btn" onclick="resetTypingProgress()">🗑️ Reset All Progress</button>
    </div>`;
}

// ─────────────────────────────────────────────
//  STORAGE
// ─────────────────────────────────────────────
function loadTypingProgress() {
  try { typingProgress = JSON.parse(localStorage.getItem(TYPING_STORAGE_KEY) || '{}'); }
  catch { typingProgress = {}; }
}
function saveTypingProgress() {
  try { localStorage.setItem(TYPING_STORAGE_KEY, JSON.stringify(typingProgress)); } catch {}
}
function resetTypingProgress() {
  if (!confirm('Reset all typing progress? This cannot be undone.')) return;
  typingProgress = {};
  saveTypingProgress();
  renderTypingProgressPage();
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}:${String(s).padStart(2,'0')}` : `${s}s`;
}

// ── Register with LearnBuddy router ──────────
if (typeof VALID_SUBJECTS !== 'undefined') VALID_SUBJECTS.push('typing');
