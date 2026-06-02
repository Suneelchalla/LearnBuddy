/* LearnBuddy — Stories Workspace UI Logic */

let storyFilter = 'all';
let currentStory = null;
let storyWordBoxes = [];
let storySelText = '';

// ── INIT STORIES ─────────────────────────────
function initStories() {
  renderGenreFilters();
  renderStoryGrid('all');
}

// ── GENRE FILTER BUTTONS ──────────────────────
function renderGenreFilters() {
  const cont = document.getElementById('story-genre-filters');
  if (!cont || cont.dataset.built) return;
  cont.dataset.built = '1';

  const genres = ['all', ...new Set(STORIES.map(s => s.genre))].sort();
  const genreIcons = {
    'all': '📚', 'Indian Mythology': '🕉️', 'Indian History': '🏛️',
    'World Mythology': '🌍', 'Fables & Moral Stories': '🐾',
    'Folk Tales': '🏺', 'Adventure': '⚔️', 'Real Life Heroes': '🌟'
  };

  cont.innerHTML = genres.map(g => {
    const icon = genreIcons[g] || '📖';
    const label = g === 'all' ? 'All Stories' : g;
    const count = g === 'all' ? STORIES.length : STORIES.filter(s => s.genre === g).length;
    return `<button class="genre-btn${g === 'all' ? ' active' : ''}" data-genre="${g}" onclick="filterStories('${g}')">
      ${icon} ${label} <span class="genre-count">${count}</span>
    </button>`;
  }).join('');
}

function filterStories(genre) {
  storyFilter = genre;
  document.querySelectorAll('.genre-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.genre === genre));
  renderStoryGrid(genre);
}

// ── STORY GRID ────────────────────────────────
// Genre styles for card headers
const GENRE_CARD_STYLE = {
  'Indian Mythology':       { bg: 'linear-gradient(135deg,#f59e0b,#ef4444)',   text: '#fff7ed' },
  'Indian History':         { bg: 'linear-gradient(135deg,#10b981,#0d9488)',   text: '#ecfdf5' },
  'World Mythology':        { bg: 'linear-gradient(135deg,#8b5cf6,#6366f1)',   text: '#f5f3ff' },
  'Fables & Moral Stories': { bg: 'linear-gradient(135deg,#06b6d4,#3b82f6)',   text: '#ecfeff' },
  'Folk Tales':             { bg: 'linear-gradient(135deg,#f97316,#f43f5e)',   text: '#fff7ed' },
  'Adventure':              { bg: 'linear-gradient(135deg,#1e40af,#7c3aed)',   text: '#eff6ff' },
  'Real Life Heroes':       { bg: 'linear-gradient(135deg,#059669,#0284c7)',   text: '#ecfdf5' },
};

function renderStoryGrid(genre) {
  const grid = document.getElementById('story-grid');
  if (!grid) return;
  const filtered = genre === 'all' ? STORIES : STORIES.filter(s => s.genre === genre);

  grid.innerHTML = filtered.map(story => {
    const style = GENRE_CARD_STYLE[story.genre] || { bg: 'linear-gradient(135deg,#4f6ef7,#8b5cf6)', text: '#eef2ff' };
    return `
    <div class="story-card" onclick="openStory('${story.id}')">
      <!-- Emoji banner header — no external images, always works -->
      <div class="story-card-banner" style="background:${style.bg};">
        <div class="story-card-emoji">${story.emoji}</div>
        <div class="story-card-genre-pill" style="color:${style.text}">${story.genre}</div>
      </div>
      <div class="story-card-body">
        <div class="story-card-title">${story.title}</div>
        <div class="story-card-summary">${story.summary}</div>
        <div class="story-card-footer">
          <span class="story-word-count">~${story.words} words</span>
          <span class="story-read-btn">Read →</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── OPEN / CLOSE STORY READER ─────────────────
function openStory(id) {
  const story = STORIES.find(s => s.id === id);
  if (!story) return;
  currentStory = story;
  storyWordBoxes = [];
  storySelText = '';

  const reader = document.getElementById('story-reader');
  const grid   = document.getElementById('story-list-view');
  grid.style.display   = 'none';
  reader.style.display = 'flex';

  // Populate reader
  document.getElementById('story-reader-title').textContent = story.emoji + ' ' + story.title;
  document.getElementById('story-reader-genre').textContent = story.genre;
  document.getElementById('story-reader-lesson').textContent = '💡 ' + story.lesson;

  // Image
  const imgEl = document.getElementById('story-reader-img');
  const imgFallback = document.getElementById('story-reader-img-fallback');
  imgEl.src = story.image;
  imgEl.alt = story.title;
  imgEl.style.display = '';
  imgFallback.style.display = 'none';
  imgEl.onerror = () => { imgEl.style.display = 'none'; imgFallback.style.display = 'flex'; imgFallback.textContent = story.emoji; };

  document.getElementById('story-img-credit').textContent = story.image_credit;

  // Render story text with clickable words
  renderStoryText(story.content);
}

function closeStoryReader() {
  document.getElementById('story-reader').style.display = 'none';
  document.getElementById('story-list-view').style.display = '';
  currentStory = null;
  storyWordBoxes = [];
  speechSynthesis.cancel();
}

// ── RENDER STORY TEXT WITH CLICKABLE WORDS ────
function renderStoryText(text) {
  const cont = document.getElementById('story-text-content');
  const paragraphs = text.trim().split('\n\n').filter(p => p.trim());

  let html = paragraphs.map(para => {
    const tokens = para.trim().match(/[a-zA-Z''-]+|[.,!?;:()""''—\-\n]|\s+/g) || [];
    const tokenHtml = tokens.map(tok => {
      const word = tok.trim();
      if (!word || /^\s+$/.test(tok)) return tok;
      if (/^[a-zA-Z''-]{2,}$/.test(word)) {
        const safe = word.replace(/'/g, '&#39;');
        return `<span class="story-word" onclick="storyWordClick('${safe}')" title="Click: ${safe}">${tok}</span>`;
      }
      return tok;
    }).join('');
    return `<p class="story-para">${tokenHtml}</p>`;
  }).join('');

  cont.innerHTML = html;
}

// ── WORD CLICK IN STORY ───────────────────────
function storyWordClick(word) {
  if (!word || word.length < 2) return;
  storySelText = word;

  // Highlight clicked word
  document.querySelectorAll('.story-word.story-active').forEach(el => el.classList.remove('story-active'));
  document.querySelectorAll('.story-word').forEach(el => {
    if (el.textContent.trim() === word) el.classList.add('story-active');
  });

  // Update the search bar
  const bar = document.getElementById('story-action-bar');
  const wordDisplay = document.getElementById('story-selected-word');
  wordDisplay.textContent = word;
  bar.style.display = 'flex';

  // Auto-fill the query field for the AI panel
  const qField = document.getElementById('story-q-field');
  if (qField) qField.value = word;
}

// ── STORY ACTION BUTTONS ──────────────────────
function storyAction(action) {
  const word = storySelText;
  if (!word) return;

  if (action === 'search') {
    window.open('https://www.google.com/search?q=' + encodeURIComponent(word), '_blank', 'noopener,noreferrer');
    return;
  }
  if (action === 'translate') {
    window.open('https://translate.google.com/?sl=auto&tl=ta&text=' + encodeURIComponent(word) + '&op=translate', '_blank', 'noopener,noreferrer');
    return;
  }
  if (action === 'dict') {
    // Reuse main dictionary lookup, show in story panel
    document.getElementById('story-ai-panel').style.display = 'flex';
    document.getElementById('story-ai-content').innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:16px"><div class="loader"></div><span style="font-size:14px;font-weight:700;color:var(--text-m)">Looking up "' + word + '"…</span></div>';
    lookupStoryDict(word);
    return;
  }
  if (action === 'tts') {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.rate = 0.85; u.lang = 'en-US';
    speechSynthesis.speak(u);
    return;
  }
  if (action === 'explain') {
    if (!getKey()) { alert('Please paste your Gemini API key in the header first.'); return; }
    document.getElementById('story-ai-panel').style.display = 'flex';
    document.getElementById('story-ai-content').innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:16px"><div class="loader"></div><span style="font-size:14px;font-weight:700;color:var(--text-m)">Explaining "' + word + '"…</span></div>';
    explainStoryWord(word);
  }
}

// ── STORY TTS ─────────────────────────────────
let storyTTSActive = false;
function toggleStoryTTS() {
  if (storyTTSActive) {
    speechSynthesis.cancel();
    return;
  }
  if (!currentStory) return;
  const u = new SpeechSynthesisUtterance(currentStory.content);
  u.rate = 0.85; u.pitch = 1.05; u.lang = 'en-US';
  u.onstart = () => {
    storyTTSActive = true;
    const btn = document.getElementById('story-tts-btn');
    if (btn) { btn.textContent = '⏹ Stop'; btn.style.background = 'var(--rose)'; }
  };
  u.onend = u.onerror = () => {
    storyTTSActive = false;
    const btn = document.getElementById('story-tts-btn');
    if (btn) { btn.textContent = '🔊 Read Aloud'; btn.style.background = ''; }
  };
  speechSynthesis.speak(u);
}

// ── STORY DICTIONARY LOOKUP ───────────────────
async function lookupStoryDict(word) {
  const cont = document.getElementById('story-ai-content');
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), { signal: ctrl.signal });
    clearTimeout(t);

    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    const entry = data[0];
    let phonetic = '', audio = '';
    (entry.phonetics || []).forEach(ph => {
      if (!phonetic && ph.text) phonetic = ph.text;
      if (!audio && ph.audio) audio = ph.audio.startsWith('//') ? 'https:' + ph.audio : ph.audio;
    });

    let html = `<div style="padding:14px 16px;border-bottom:1.5px solid var(--border);background:var(--white);">
      <div style="font-size:22px;font-weight:900;color:var(--text-h)">${entry.word}</div>
      ${phonetic ? `<div style="font-size:13px;font-weight:700;color:var(--purple)">${phonetic}</div>` : ''}
      ${audio ? `<button class="dict-audio-btn" onclick="new Audio('${audio}').play()">🔊 Hear it</button>` : ''}
    </div><div style="padding:12px 16px;overflow-y:auto;max-height:300px;">`;

    (entry.meanings || []).slice(0, 3).forEach(m => {
      html += `<div class="dict-pos">${m.partOfSpeech}</div>`;
      (m.definitions || []).slice(0, 2).forEach((d, i) => {
        html += `<div class="dict-definition"><strong>${i+1}.</strong> ${d.definition}</div>`;
        if (d.example) html += `<div class="dict-example">${d.example}</div>`;
      });
    });
    html += '</div>';
    cont.innerHTML = html;
  } catch {
    // Fallback to local dict
    const local = LOCAL_DICT[word.toLowerCase()];
    if (local) {
      cont.innerHTML = `<div style="padding:14px 16px">
        <div style="font-size:22px;font-weight:900;color:var(--text-h)">${word}</div>
        <div class="dict-pos">${local.pos}</div>
        <div class="dict-definition">${local.def}</div>
        ${local.ex ? `<div class="dict-example">${local.ex}</div>` : ''}
        <div style="font-size:11px;color:var(--text-l);margin-top:8px;">📚 Local dictionary</div>
      </div>`;
    } else {
      cont.innerHTML = `<div style="padding:16px;text-align:center">
        <div style="font-size:14px;font-weight:700;color:var(--text-m);margin-bottom:10px">Word not found locally</div>
        <a href="https://www.google.com/search?q=define+${encodeURIComponent(word)}" target="_blank" class="dict-google-btn" style="font-size:13px">🔍 Search Google</a>
      </div>`;
    }
  }
}

// ── STORY AI EXPLAIN ──────────────────────────
async function explainStoryWord(word) {
  const cont = document.getElementById('story-ai-content');
  try {
    const prompt = `Explain the word "${word}" as it might appear in a story, for a child aged 8-12. Keep it simple and friendly. Return ONLY valid JSON: {"definition":"simple meaning","example":"example sentence","fun_fact":"one interesting thing about this word"}`;
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + getKey(),
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{parts:[{text:prompt}]}], generationConfig:{temperature:0.5,maxOutputTokens:300} }) });
    const data = await res.json();
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    raw = raw.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s >= 0 && e > s) raw = raw.slice(s, e+1);
    const d = JSON.parse(raw);
    cont.innerHTML = `<div style="padding:16px">
      <div style="font-size:20px;font-weight:900;color:var(--blue-d);margin-bottom:8px">${word}</div>
      <div class="info-card" style="margin-bottom:10px">${d.definition || ''}</div>
      ${d.example ? `<div style="font-size:13px;font-style:italic;color:var(--text-m);margin-bottom:8px">"${d.example}"</div>` : ''}
      ${d.fun_fact ? `<div class="info-card green" style="font-size:13px">${d.fun_fact}</div>` : ''}
    </div>`;
  } catch(e) {
    cont.innerHTML = '<div style="padding:16px;color:var(--rose);font-weight:700">❌ Could not explain. Check your API key.</div>';
  }
}

function closeStoryAIPanel() {
  document.getElementById('story-ai-panel').style.display = 'none';
}

// ── STORY SEARCH ──────────────────────────────
function storyGoQuery() {
  const word = document.getElementById('story-q-field').value.trim();
  if (!word) return;
  storySelText = word;
  document.getElementById('story-selected-word').textContent = word;
  document.getElementById('story-action-bar').style.display = 'flex';
  storyWordClick(word);
}

// ── REGISTER story hash route ──────────────────
if (typeof VALID_SUBJECTS !== 'undefined') {
  VALID_SUBJECTS.push('stories');
}
