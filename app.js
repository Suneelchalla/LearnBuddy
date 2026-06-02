/* LearnBuddy — Main Application Logic
   ===================================== */

/* ═══════════════════════════════════════════════════════
   LEARNBUDDY — FULL APPLICATION LOGIC
   Clean, well-structured, parent & child friendly
═══════════════════════════════════════════════════════ */

// ── STATE ──
let pages = [], curPage = 0;
let selText = '';
let extractedText = '';
let curTab = 'search';
let ttsActive = false;
let nbFilter = 'all';
let practiceQueue = [], practiceIdx = 0, practiceScore = 0;

// ── API KEY ──
const apiInput = document.getElementById('api-input');
const apiStatus = document.getElementById('api-status');
apiInput.value = localStorage.getItem('lb_key') || '';
checkKey();
apiInput.addEventListener('input', () => { localStorage.setItem('lb_key', apiInput.value.trim()); checkKey(); });
function checkKey() {
  const k = apiInput.value.trim();
  const ok = k.length > 15 && (k.startsWith('AIza') || k.startsWith('AQ') || k.startsWith('AI'));
  apiStatus.className = 'api-status' + (ok ? ' ok' : k ? ' bad' : '');
}
function getKey() { return apiInput.value.trim(); }
function needKey() {
  if (!getKey() || getKey().length < 10) {
    toast('⚠️ Please paste your Gemini API key in the top bar first\n(Get one free at aistudio.google.com)', 4000);
    apiInput.focus();
    return true;
  }
  return false;
}

// ── FILE HANDLING ──
function handleFiles(files) {
  [...files].forEach(f => {
    if (!f.type.startsWith('image/')) { toast('⚠️ Only image files are supported'); return; }
    const r = new FileReader();
    r.onerror = () => toast('❌ Could not read file: ' + f.name);
    r.onload = e => { if (e.target?.result) addPage(e.target.result, f.name); };
    r.readAsDataURL(f);
  });
}

function addPage(dataUrl, name) {
  try {
    // Compress: resize to max 1200px wide, JPEG quality 0.88
    const img = new Image();
    img.onload = () => {
      const maxW = 1200, maxH = 1600;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio); h = Math.round(h * ratio);
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      const compressed = c.toDataURL('image/jpeg', 0.88);
      _addPageDirect(compressed, name || 'Page ' + (pages.length + 1));
    };
    img.src = dataUrl;
  } catch (e) {
    toast('❌ Error loading image: ' + (e.message || e));
    console.error(e);
  }
}

function _addPageDirect(dataUrl, name) {
  try {
    pages.push({ dataUrl, name });
    renderThumbs();
    showPage(pages.length - 1);
    document.getElementById('upload-area').style.display = 'none';
    document.getElementById('thumb-bar').style.display = 'flex';
    const vEl = document.getElementById('viewer'); vEl.style.display = 'flex';
    document.getElementById('status-bar').style.display = 'flex';
    document.getElementById('btn-extract').style.display = '';
    document.getElementById('btn-pdf').style.display = '';
    document.getElementById('btn-clr').style.display = '';
    document.getElementById('btn-max').style.display = '';
  } catch (e) {
    toast('❌ Error loading image: ' + (e.message || e));
    console.error(e);
  }
}

function renderThumbs() {
  const bar = document.getElementById('thumb-bar');
  bar.innerHTML = '';
  pages.forEach((p, i) => {
    const t = document.createElement('div');
    t.className = 'thumb' + (i === curPage ? ' active' : '');
    t.onclick = () => showPage(i);
    t.innerHTML = '<img src="' + p.dataUrl + '" alt="pg' + (i+1) + '"><div class="thumb-num">' + (i+1) + '</div><div class="thumb-del" onclick="event.stopPropagation();deletePage(' + i + ')" title="Delete this page">✕</div>';
    bar.appendChild(t);
  });
  const add = document.createElement('div');
  add.className = 'thumb-add'; add.title = 'Add more pages';
  add.innerHTML = '+<input type="file" accept="image/*" multiple onchange="handleFiles(this.files)">';
  bar.appendChild(add);
}

function deletePage(i) {
  pages.splice(i, 1);
  if (!pages.length) {
    clearAll(true); return;
  }
  // Stay on same index or last page
  curPage = Math.min(curPage, pages.length - 1);
  renderThumbs();
  showPage(curPage);
  toast('🗑 Page ' + (i+1) + ' removed');
}

function showPage(i) {
  curPage = i;
  wordBoxes = []; extractedText = ''; currentSelectedWords = [];
  clearSelDisplay();
  document.getElementById('pg-lbl').textContent = 'Page ' + (i+1) + ' of ' + pages.length;
  renderThumbs();
  setStatus('default', 'Click "🔍 Map Words" to make the text interactive on page ' + (i+1));

  // Load image into hidden img, then draw on canvas
  const img = document.getElementById('cur-img');
  const canvas = document.getElementById('lesson-canvas');
  img.onload = () => {
    // Reset canvas buffer size to new image
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.style.display = 'block';
    drawCanvas();
    initCanvasEvents();
  };
  img.src = pages[i].dataUrl;
}

function clearAll(skipConfirm) {
  if (!skipConfirm && !confirm('Remove all pages and start over?')) return;
  pages = []; curPage = 0; extractedText = '';
  speechSynthesis.cancel(); ttsActive = false; resetTTSBtn();
  document.getElementById('upload-area').style.display = '';
  ['thumb-bar','viewer','status-bar'].forEach(id => { document.getElementById(id).style.display = 'none'; });
  ['btn-extract','btn-pdf','btn-clr','btn-max'].forEach(id => { document.getElementById(id).style.display = 'none'; });
  showEmpty();
}

// ── DRAG & DROP (images) ──
const dz = document.getElementById('drop-zone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('over'));
dz.addEventListener('drop', e => {
  e.preventDefault(); dz.classList.remove('over');
  const files = e.dataTransfer.files;
  // Check if any PDF was dropped on the image zone
  const pdfFile = [...files].find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
  if (pdfFile) { handlePDF(pdfFile); return; }
  handleFiles(files);
});

// ── DRAG & DROP (PDF zone) ──
const pdfDz = document.getElementById('pdf-drop-zone');
if (pdfDz) {
  pdfDz.addEventListener('dragover', e => { e.preventDefault(); pdfDz.classList.add('over'); });
  pdfDz.addEventListener('dragleave', () => pdfDz.classList.remove('over'));
  pdfDz.addEventListener('drop', e => {
    e.preventDefault(); pdfDz.classList.remove('over');
    const file = [...e.dataTransfer.files].find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (file) handlePDF(file);
    else toast('⚠️ Please drop a PDF file here');
  });
}

// ── PDF UPLOAD & CONVERSION ──
// Uses PDF.js to render each page to a canvas → JPEG → addPage()
async function handlePDF(file) {
  if (!file) return;
  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    toast('⚠️ Please select a PDF file'); return;
  }

  // Show progress bar
  const prog = document.getElementById('pdf-progress');
  const progLabel = document.getElementById('pdf-progress-label');
  const progFill = document.getElementById('pdf-progress-fill');
  prog.style.display = 'flex';
  progLabel.textContent = 'Loading PDF…';
  progFill.style.width = '0%';

  try {
    // Configure PDF.js worker
    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } else {
      toast('❌ PDF.js not loaded. Check your internet connection.');
      prog.style.display = 'none'; return;
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdfDoc.numPages;

    toast(`📄 Converting ${totalPages} page${totalPages > 1 ? 's' : ''}…`);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      progLabel.textContent = `Converting page ${pageNum} of ${totalPages}…`;
      progFill.style.width = ((pageNum - 1) / totalPages * 100) + '%';

      const page = await pdfDoc.getPage(pageNum);

      // Render at 1.8× scale for good resolution
      const scale = 1.8;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Convert to JPEG and add as a page
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const pageName = file.name.replace(/\.pdf$/i, '') + ' — Page ' + pageNum;

      // addPage compresses further if needed
      addPage(dataUrl, pageName);

      // Small yield to keep UI responsive
      await new Promise(r => setTimeout(r, 10));
    }

    progFill.style.width = '100%';
    progLabel.textContent = `✅ ${totalPages} pages loaded from "${file.name}"`;
    setTimeout(() => { prog.style.display = 'none'; }, 2500);
    toast(`✅ PDF loaded — ${totalPages} pages added!`);

  } catch (err) {
    prog.style.display = 'none';
    toast('❌ Could not read PDF: ' + (err.message || err).toString().slice(0, 80));
    console.error('PDF error:', err);
  }
}

// ── PASTE (capture phase — works even when an input is focused) ──
window.addEventListener('paste', e => {
  const items = Array.from(e.clipboardData?.items || []);
  const img = items.find(it => it.type.startsWith('image/'));
  if (!img) return;
  e.preventDefault(); e.stopPropagation();
  const file = img.getAsFile();
  if (!file) { toast('⚠️ Could not read image from clipboard'); return; }
  const r = new FileReader();
  r.onerror = () => toast('❌ Failed to read clipboard image');
  r.onload = ev => {
    if (!ev.target?.result) { toast('❌ Empty image from clipboard'); return; }
    addPage(ev.target.result, 'Screenshot ' + (pages.length + 1));
    toast('📸 Screenshot added!');
  };
  r.readAsDataURL(file);
}, true);

// ── SAVE PDF ──
async function savePDF() {
  if (!pages.length) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();
    const img = new Image(); img.src = pages[i].dataUrl;
    await new Promise(r => img.onload = r);
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pw / img.width, ph / img.height);
    const w = img.width * ratio, h = img.height * ratio;
    pdf.addImage(pages[i].dataUrl, 'JPEG', (pw-w)/2, (ph-h)/2, w, h);
  }
  pdf.save('lesson.pdf');
  toast('📄 Lesson saved as PDF!');
}

// ── OCR TEXT EXTRACTION ──
// ═══════════════════════════════════════════════════════
//  INTERACTIVE CANVAS WORD MAPPER
//  Uses Tesseract word-level bounding boxes.
//  User clicks a word OR drags to select multiple words.
// ═══════════════════════════════════════════════════════

let wordBoxes = [];        // [{text, x, y, w, h}] in canvas coords
let canvasScale = 1;       // ratio: canvas CSS px / natural image px
let isDragging = false;
let dragStart  = { x: 0, y: 0 };
let dragCurrent= { x: 0, y: 0 };
let currentSelectedWords = [];

async function extractOCR() {
  if (!pages.length) return;
  const btn = document.getElementById('btn-extract');
  btn.disabled = true;
  setStatus('working', '⏳ Mapping words on image… 0%');

  try {
    const srcImg = document.getElementById('cur-img');

    // Build an offscreen canvas at 2× for better OCR
    const offscreen = document.createElement('canvas');
    const scale = 2;
    offscreen.width  = srcImg.naturalWidth  * scale;
    offscreen.height = srcImg.naturalHeight * scale;
    const octx = offscreen.getContext('2d');
    octx.filter = 'contrast(1.25) brightness(1.06)';
    octx.drawImage(srcImg, 0, 0, offscreen.width, offscreen.height);

    // Run Tesseract with word-level data
    const result = await Tesseract.recognize(offscreen.toDataURL('image/png'), 'eng', {
      logger: m => {
        if (m.status === 'recognizing text')
          setStatus('working', '⏳ Mapping words… ' + Math.round(m.progress * 100) + '%');
      },
      tessedit_pageseg_mode: '6',
    });

    // Extract word bounding boxes, filter garbage
    const rawWords = result.data.words || [];
    wordBoxes = rawWords
      .filter(w => {
        const t = w.text.trim();
        if (t.length < 2) return false;
        const alpha = (t.match(/[a-zA-Z0-9]/g) || []).length;
        if (alpha / t.length < 0.5) return false;
        if (w.confidence < 30) return false;
        return true;
      })
      .map(w => ({
        text: w.text.replace(/[^a-zA-Z0-9''\-.,!?]/g, '').trim(),
        // Tesseract coords are in offscreen (2×) space — convert to natural image space
        x: w.bbox.x0 / scale,
        y: w.bbox.y0 / scale,
        w: (w.bbox.x1 - w.bbox.x0) / scale,
        h: (w.bbox.y1 - w.bbox.y0) / scale,
        conf: w.confidence,
        selected: false,
      }))
      .filter(w => w.text.length > 0);

    if (!wordBoxes.length) {
      setStatus('err', '⚠️ No words found. Try a higher-resolution image.');
      btn.disabled = false; return;
    }

    // Build extracted text for TTS
    extractedText = wordBoxes.map(w => w.text).join(' ');

    // Draw image on the visible canvas
    drawCanvas();

    // Show word area and status
    setStatus('done', '✅ ' + wordBoxes.length + ' words mapped — click a word, or drag to select multiple!');
    toast('✅ Words mapped! Click any word directly on the image.');

  } catch (err) {
    setStatus('err', '❌ Failed: ' + (err.message || '').slice(0, 80));
    toast('❌ Word mapping failed. Try a clearer image.');
    console.error(err);
  }
  btn.disabled = false;
}

// Draw the image + highlighted words onto the visible canvas
function drawCanvas(hoverIdx, selRect) {
  const canvas = document.getElementById('lesson-canvas');
  const srcImg = document.getElementById('cur-img');
  if (!canvas || !srcImg.naturalWidth) return;

  // Set internal drawing buffer to natural image size (needed for pixel-accurate hit testing)
  // CSS max-width/max-height handles visual scaling — do NOT set canvas.style.width/height here
  if (canvas.width !== srcImg.naturalWidth) {
    canvas.width  = srcImg.naturalWidth;
    canvas.height = srcImg.naturalHeight;
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(srcImg, 0, 0);

  // Draw word highlight boxes
  wordBoxes.forEach((wb, i) => {
    if (wb.selected) {
      ctx.fillStyle   = 'rgba(79,110,247,0.28)';
      ctx.strokeStyle = '#4f6ef7';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(wb.x - 2, wb.y - 1, wb.w + 4, wb.h + 2, 3);
      ctx.fill(); ctx.stroke();
    } else if (i === hoverIdx) {
      ctx.fillStyle   = 'rgba(245,158,11,0.2)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.roundRect(wb.x - 2, wb.y - 1, wb.w + 4, wb.h + 2, 3);
      ctx.fill(); ctx.stroke();
    }
  });

  // Draw drag selection rectangle
  if (selRect) {
    ctx.fillStyle   = 'rgba(79,110,247,0.12)';
    ctx.strokeStyle = '#4f6ef7';
    ctx.lineWidth   = 2;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(selRect.x, selRect.y, selRect.w, selRect.h);
    ctx.fillRect(selRect.x, selRect.y, selRect.w, selRect.h);
    ctx.setLineDash([]);
  }
}

// Convert mouse event position to image coordinate space
function mouseToImageCoords(e) {
  const canvas = document.getElementById('lesson-canvas');
  const rect = canvas.getBoundingClientRect();
  // CSS size vs natural size ratio
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left)  * scaleX,
    y: (e.clientY - rect.top)   * scaleY,
  };
}

// Find which word index is at image position (x,y)
function hitTest(x, y) {
  for (let i = 0; i < wordBoxes.length; i++) {
    const b = wordBoxes[i];
    const pad = 4;
    if (x >= b.x - pad && x <= b.x + b.w + pad &&
        y >= b.y - pad && y <= b.y + b.h + pad) return i;
  }
  return -1;
}

// Get all word indices inside a rectangle
function wordsInRect(rx, ry, rw, rh) {
  const x0 = Math.min(rx, rx + rw), x1 = Math.max(rx, rx + rw);
  const y0 = Math.min(ry, ry + rh), y1 = Math.max(ry, ry + rh);
  return wordBoxes.reduce((acc, wb, i) => {
    const cx = wb.x + wb.w / 2, cy = wb.y + wb.h / 2;
    if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) acc.push(i);
    return acc;
  }, []);
}

// Set up canvas interaction once it's visible
function initCanvasEvents() {
  const canvas = document.getElementById('lesson-canvas');
  if (canvas._eventsAttached) return;
  canvas._eventsAttached = true;
  let hoverIdx = -1;

  canvas.addEventListener('mousemove', e => {
    if (isDragging) {
      dragCurrent = mouseToImageCoords(e);
      const rx = dragCurrent.x - dragStart.x, ry = dragCurrent.y - dragStart.y;
      drawCanvas(-1, { x: dragStart.x, y: dragStart.y, w: rx, h: ry });
      return;
    }
    const { x, y } = mouseToImageCoords(e);
    const idx = hitTest(x, y);
    if (idx !== hoverIdx) {
      hoverIdx = idx;
      canvas.style.cursor = idx >= 0 ? 'pointer' : 'crosshair';
      drawCanvas(hoverIdx);
    }
  });

  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    isDragging = true;
    dragStart = mouseToImageCoords(e);
    dragCurrent = { ...dragStart };
  });

  canvas.addEventListener('mouseup', e => {
    if (!isDragging) return;
    isDragging = false;
    const end = mouseToImageCoords(e);
    const dx = Math.abs(end.x - dragStart.x), dy = Math.abs(end.y - dragStart.y);

    if (dx < 8 && dy < 8) {
      // CLICK — single word
      const idx = hitTest(end.x, end.y);
      if (idx >= 0) {
        wordBoxes.forEach(w => w.selected = false);
        wordBoxes[idx].selected = true;
        drawCanvas();
        onWordsSelected([wordBoxes[idx].text]);
      } else {
        // Clicked empty area — deselect
        wordBoxes.forEach(w => w.selected = false);
        drawCanvas();
        clearSelDisplay();
      }
    } else {
      // DRAG — multi-word selection
      const rx = end.x - dragStart.x, ry = end.y - dragStart.y;
      const indices = wordsInRect(dragStart.x, dragStart.y, rx, ry);
      wordBoxes.forEach((w, i) => w.selected = indices.includes(i));
      drawCanvas();
      if (indices.length > 0) {
        onWordsSelected(indices.map(i => wordBoxes[i].text));
      } else {
        clearSelDisplay();
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (isDragging) { isDragging = false; drawCanvas(); }
    hoverIdx = -1; drawCanvas();
  });

  // Right-click context menu
  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const imgCtxMenu = document.getElementById('img-ctx');
    imgCtxMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
    imgCtxMenu.style.top  = Math.min(e.clientY, window.innerHeight - 140) + 'px';
    imgCtxMenu.classList.add('show');
  });
}

function onWordsSelected(words) {
  const text = words.filter(w => w.length > 1).join(' ').trim();
  if (!text) return;
  currentSelectedWords = words;
  selText = text;
  document.getElementById('q-field').value = text;
  // Show selection display row
  const row = document.getElementById('sel-text-row');
  document.getElementById('sel-text-display').textContent = text;
  row.style.display = 'flex';
  // Show the selection popup menu
  const pop = document.getElementById('sel-pop');
  document.getElementById('sel-preview').textContent = text.length > 35 ? text.slice(0, 35) + '…' : text;
  // Position near center-bottom of canvas
  const canvas = document.getElementById('lesson-canvas');
  const rect = canvas.getBoundingClientRect();
  pop.style.left = Math.min(rect.left + rect.width / 2, window.innerWidth - 225) + 'px';
  pop.style.top  = Math.min(rect.bottom + 8, window.innerHeight - 310) + 'px';
  pop.classList.add('show');
}

function clearSelDisplay() {
  document.getElementById('sel-text-row').style.display = 'none';
  document.getElementById('sel-text-display').textContent = '';
}
function clearSelection() {
  wordBoxes.forEach(w => w.selected = false);
  drawCanvas();
  clearSelDisplay();
  setStatus('done', '✅ Selection cleared. Click or drag on the image to select words.');
}
function useSelectedText() {
  const t = document.getElementById('sel-text-display').textContent.trim();
  if (!t) return;
  if (curTab === 'search') { updateSearchLinks(t); return; }
  if (curTab === 'notebook') switchTab('explain');
  if (needKey()) return;
  callGemini(curTab, t);
}

// ── STATUS / TTS BAR ──
function setStatus(type, msg) {
  const el = document.getElementById('status-text');
  el.textContent = msg;
  el.className = 'status-text' + (type === 'working' ? ' working' : type === 'done' ? ' done' : type === 'err' ? ' err' : '');
}
function toggleTTS() {
  if (ttsActive) { speechSynthesis.cancel(); return; }
  const text = extractedText || document.getElementById('manual-inp').value.trim();
  if (!text) { toast('⚠️ Click "🔍 Map Words" first to process the image!'); return; }
  speakText(text);
}
function speakText(text) {
  if (!window.speechSynthesis) { toast('Speech not supported in this browser'); return; }
  speechSynthesis.cancel();
  const rate = parseFloat(document.getElementById('tts-speed').value) || 0.85;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = rate; u.pitch = 1.05; u.lang = 'en-US';
  u.onstart = () => {
    ttsActive = true;
    document.getElementById('tts-btn').textContent = '⏹';
    document.getElementById('tts-btn').classList.add('playing');
    // Show speed buttons while playing
    const sb = document.getElementById('tts-speed-btns');
    if (sb) sb.style.display = 'flex';
  };
  u.onend = u.onerror = resetTTSBtn;
  speechSynthesis.speak(u);
}
function resetTTSBtn() {
  ttsActive = false;
  const btn = document.getElementById('tts-btn');
  if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
  const sb = document.getElementById('tts-speed-btns');
  if (sb) sb.style.display = 'none';
}
function setSpeed(val) {
  document.getElementById('tts-speed').value = String(val);
  document.querySelectorAll('.spd-btn').forEach(b => b.classList.remove('active'));
  const map = {'0.7':'spd-slow','0.85':'spd-norm','1.1':'spd-fast'};
  const el = document.getElementById(map[String(val)]);
  if (el) el.classList.add('active');
  // Restart with new speed if currently playing
  if (ttsActive) {
    const text = extractedText || document.getElementById('manual-inp').value.trim();
    if (text) speakText(text);
  }
}

function clickWord(word) {
  // Called from manual input — no canvas, just run directly
  if (!word || word.length < 1) return;
  selText = word;
  document.getElementById('q-field').value = word;
  if (curTab === 'search') { updateSearchLinks(word); toast('🔍 Searching for "' + word + '"'); return; }
  if (curTab === 'translate') { showTranslateUI(word); return; }
  if (curTab === 'dict') { lookupDictionary(word); return; }
  if (curTab === 'notebook') switchTab('explain');
  if (needKey()) return;
  callGemini(curTab, word);
}

// ── IMAGE CONTEXT MENU ──
function hideImgCtx() { document.getElementById('img-ctx').classList.remove('show'); }
function imgCtx(type) {
  hideImgCtx();
  if (type === 'read')    extractOCR();
  if (type === 'pdf')     savePDF();
  if (type === 'explain') { if (!needKey()) callGeminiWithImage(); }
}

// ── IMAGE CONTEXT MENU ──
const imgCtxMenu = document.getElementById('img-ctx');
document.getElementById('cur-img').addEventListener('contextmenu', e => {
  e.preventDefault();
  imgCtxMenu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
  imgCtxMenu.style.top  = Math.min(e.clientY, window.innerHeight - 140) + 'px';
  imgCtxMenu.classList.add('show');
});
function hideImgCtx() { imgCtxMenu.classList.remove('show'); }
function imgCtx(type) {
  hideImgCtx();
  if (type === 'read')    extractOCR();
  if (type === 'pdf')     savePDF();
  if (type === 'explain') { if (!needKey()) callGeminiWithImage(); }
}

// ── TEXT SELECTION POPUP ──
const selPop = document.getElementById('sel-pop');
document.addEventListener('mouseup', e => {
  if (selPop.contains(e.target) || imgCtxMenu.contains(e.target)) return;
  setTimeout(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { hideSelPop(); return; }
    const text = sel.toString().trim();
    if (text.length < 2) { hideSelPop(); return; }
    selText = text;
    document.getElementById('q-field').value = text;
    document.getElementById('sel-preview').textContent = text.length > 35 ? text.slice(0, 35) + '…' : text;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    selPop.style.left = Math.min(rect.left + rect.width / 2, window.innerWidth - 220) + 'px';
    selPop.style.top  = Math.min(rect.bottom + 8, window.innerHeight - 310) + 'px';
    selPop.classList.add('show');
  }, 10);
});
document.addEventListener('mousedown', e => {
  if (!selPop.contains(e.target))     hideSelPop();
  if (!imgCtxMenu.contains(e.target)) hideImgCtx();
});
function hideSelPop() { selPop.classList.remove('show'); }
function selAct(type) {
  hideSelPop();
  const t = selText;
  if (!t) return;
  if (type === 'tts')    { speakText(t); return; }
  if (type === 'save')   { saveWord(t); return; }
  if (type === 'search') { switchTab('search'); updateSearchLinks(t); return; }
  if (type === 'translate') { switchTab('translate'); document.getElementById('q-field').value = t; showTranslateUI(t); return; }
  if (type === 'dict') { switchTab('dict'); document.getElementById('q-field').value = t; lookupDictionary(t); return; }
  if (needKey()) return;
  switchTab(type);
  document.getElementById('q-field').value = t;
  callGemini(type, t);
}

// ── TAB NAVIGATION ──
function switchTab(tab) {
  curTab = tab;
  document.querySelectorAll('.tnav-tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.getElementById('tab-' + tab);
  if (tabEl) tabEl.classList.add('active');

  // Query bar: hide on notebook tab
  document.getElementById('query-bar').style.display = tab === 'notebook' ? 'none' : '';

  // Hide all content panels
  ['empty-s','load-s','result-s','search-area','translate-area','dict-area','notebook-area'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  if (tab === 'search') {
    document.getElementById('search-area').style.display = 'flex';
    updateSearchLinks(document.getElementById('q-field').value || '');
  } else if (tab === 'translate') {
    document.getElementById('translate-area').style.display = 'flex';
    const cur = document.getElementById('q-field').value.trim();
    if (cur) showTranslateUI(cur);
  } else if (tab === 'dict') {
    document.getElementById('dict-area').style.display = 'flex';
    const cur = document.getElementById('q-field').value.trim();
    if (cur) lookupDictionary(cur);
  } else if (tab === 'notebook') {
    document.getElementById('notebook-area').style.display = 'flex';
    renderNotebook();
  } else {
    // explain / translate / quiz — show result or empty
    const rs = document.getElementById('result-s');
    if (rs.getAttribute('data-tab') === tab && rs.getAttribute('data-has') === '1') {
      rs.style.display = 'flex';
    } else {
      showEmpty();
    }
  }
  const ph = {
    search:    'Search for any word or phrase…',
    explain:   'Type a word or phrase to explain…',
    translate: 'Type or select text to translate…',
    dict:      'Type a word to look up in the dictionary…'
  };
  const qf = document.getElementById('q-field');
  if (ph[tab] && qf) qf.placeholder = ph[tab];
}

function showEmpty() {
  document.getElementById('empty-s').style.display = 'flex';
  document.getElementById('load-s').style.display = 'none';
  document.getElementById('result-s').style.display = 'none';
}

function goQuery() {
  const t = document.getElementById('q-field').value.trim();
  if (!t) { toast('⚠️ Please type a word or phrase first'); return; }
  selText = t;
  if (curTab === 'search') { updateSearchLinks(t); return; }
  if (curTab === 'translate') { showTranslateUI(t); return; }
  if (curTab === 'dict') { lookupDictionary(t); return; }
  if (needKey()) return;
  callGemini(curTab, t);
}

// ── DICTIONARY LOOKUP (Free Dictionary API — no key needed) ──


// Uses https://api.dictionaryapi.dev/api/v2/entries/en/<word>
async function lookupDictionary(word) {
  if (!word || word.trim().length < 1) return;
  word = word.trim().split(/\s+/)[0]; // single word only for dictionary

  // Switch to dict tab and show loading
  switchTab('dict');
  document.getElementById('q-field').value = word;
  selText = word;

  const loading = document.getElementById('dict-loading');
  const results = document.getElementById('dict-results');
  loading.style.display = 'flex';
  results.innerHTML = '';
  results.style.display = 'none';

  try {
    // Try API first with 4-second timeout
    const controller = new AbortController();
    const apiTimeout = setTimeout(() => controller.abort(), 4000);
    let res;
    try {
      res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word), { signal: controller.signal });
      clearTimeout(apiTimeout);
    } catch (fetchErr) {
      clearTimeout(apiTimeout);
      // Network error or timeout — fall back to local dictionary
      return showLocalDictEntry(word, loading, results);
    }

    if (res.status === 404) {
      // Not in online dict — check local dict first, then Google
      loading.style.display = 'none';
      if (LOCAL_DICT[word.toLowerCase()]) {
        return showLocalDictEntry(word, loading, results);
      }
      results.style.display = 'block';
      results.innerHTML = buildNotFoundHTML(word);
      return;
    }

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    loading.style.display = 'none';
    results.style.display = 'block';

    let html = '';

    // Each entry in the response
    data.forEach((entry, ei) => {
      if (ei > 0) html += '<hr style="border:none;border-top:2px solid var(--border);margin:8px 0 14px;">';

      html += '<div class="dict-entry">';

      // Word + phonetic
      html += '<div class="dict-word">' + entry.word + '</div>';

      // Find best phonetic with audio
      let audioUrl = '';
      let phoneticText = '';
      if (entry.phonetics && entry.phonetics.length) {
        for (const ph of entry.phonetics) {
          if (ph.audio && !audioUrl) audioUrl = ph.audio;
          if (ph.text && !phoneticText) phoneticText = ph.text;
        }
      }
      if (phoneticText) html += '<div class="dict-phonetic">' + phoneticText + '</div>';
      if (audioUrl) {
        // Fix relative URLs
        if (audioUrl.startsWith('//')) audioUrl = 'https:' + audioUrl;
        html += '<button class="dict-audio-btn" onclick="playDictAudio(\'' + audioUrl.replace(/'/g,"\\'") + '\')">🔊 Hear pronunciation</button>';
      }

      // Meanings
      if (entry.meanings && entry.meanings.length) {
        entry.meanings.slice(0, 4).forEach(meaning => {
          html += '<div class="dict-pos">' + meaning.partOfSpeech + '</div>';

          meaning.definitions.slice(0, 3).forEach((def, di) => {
            html += '<div class="dict-definition"><strong>' + (di + 1) + '.</strong> ' + def.definition + '</div>';
            if (def.example) html += '<div class="dict-example">' + def.example + '</div>';
          });

          // Synonyms
          const syns = (meaning.synonyms || []).slice(0, 6);
          if (syns.length) {
            html += '<div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-l);margin:8px 0 5px;">Synonyms</div>'
              + '<div class="dict-synonyms">'
              + syns.map(s => '<span class="dict-syn-chip" onclick="lookupDictionary(\'' + s.replace(/'/g,"\\'") + '\')" title="Look up ' + s + '">' + s + '</span>').join('')
              + '</div>';
          }
        });
      }

      html += '</div>'; // dict-entry

      // Source links
      if (entry.sourceUrls && entry.sourceUrls.length) {
        html += '<div style="font-size:11px;font-weight:600;color:var(--text-l);margin-bottom:10px;">Source: '
          + entry.sourceUrls.map(u => '<a href="' + u + '" target="_blank" style="color:var(--blue);text-decoration:none;">' + u.replace('https://','') + '</a>').join(', ')
          + '</div>';
      }
    });

    // Also add Google / Merriam-Webster links at bottom
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;">'
      + '<a href="https://www.google.com/search?q=define+' + encodeURIComponent(word) + '" target="_blank" '
      + 'style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:2px solid var(--border);border-radius:var(--r-sm);background:var(--white);color:var(--text-m);font-family:var(--font);font-size:12px;font-weight:700;text-decoration:none;transition:all .15s;"'
      + ' onmouseover="this.style.borderColor=\'#4285f4\';this.style.color=\'#1a73e8\'"'
      + ' onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-m)\'">🔍 Google</a>'
      + '<a href="https://www.merriam-webster.com/dictionary/' + encodeURIComponent(word) + '" target="_blank" '
      + 'style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:2px solid var(--border);border-radius:var(--r-sm);background:var(--white);color:var(--text-m);font-family:var(--font);font-size:12px;font-weight:700;text-decoration:none;transition:all .15s;"'
      + ' onmouseover="this.style.borderColor=\'#2c3e50\';this.style.color=\'#2c3e50\'"'
      + ' onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-m)\'">📖 Merriam-Webster</a>'
      + '<a href="https://www.oxfordlearnersdictionaries.com/definition/english/' + encodeURIComponent(word) + '" target="_blank" '
      + 'style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:2px solid var(--border);border-radius:var(--r-sm);background:var(--white);color:var(--text-m);font-family:var(--font);font-size:12px;font-weight:700;text-decoration:none;transition:all .15s;"'
      + ' onmouseover="this.style.borderColor=\'#003087\';this.style.color=\'#003087\'"'
      + ' onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--text-m)\'">🎓 Oxford</a>'
      + '</div>';

    results.innerHTML = html;

  } catch (err) {
    // On any error, try local dictionary
    return showLocalDictEntry(word, loading, results);
    console.error('Dictionary error:', err);
  }
}


// ── DICTIONARY HELPER FUNCTIONS ──

function buildNotFoundHTML(word) {
  const enc = encodeURIComponent(word);
  return '<div class="dict-not-found">'
    + '<div class="nf-icon">🔍</div>'
    + '<div class="nf-title">Word not found in dictionary</div>'
    + '<div class="nf-sub">The word <strong>"' + word + '"</strong> was not found.<br>It may be a proper noun, name, or spelling variant.</div>'
    + '<a href="https://www.google.com/search?q=define+' + enc + '" target="_blank" class="dict-google-btn">'
    + '🔍 Search Google for "' + word + '"</a><br>'
    + '<a href="https://www.merriam-webster.com/dictionary/' + enc + '" target="_blank" '
    + 'style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:var(--white);color:var(--text-m);border:2px solid var(--border);border-radius:var(--r-md);text-decoration:none;font-size:13px;font-weight:700;margin-top:8px;">'
    + '📖 Try Merriam-Webster</a>'
    + '</div>';
}

function showLocalDictEntry(word, loading, results) {
  const key = word.toLowerCase();
  const entry = LOCAL_DICT[key];
  loading.style.display = 'none';
  results.style.display = 'block';

  if (!entry) {
    results.innerHTML = buildNotFoundHTML(word);
    return;
  }

  const enc = encodeURIComponent(word);
  const syns = (entry.syns || []).map(s =>
    '<span class="dict-syn-chip" onclick="lookupDictionary(&quot;' + s + '&quot;)">' + s + '</span>'
  ).join('');

  results.innerHTML =
    '<div class="dict-entry">'
    + '<div class="dict-word">' + word + '</div>'
    + '<div class="dict-pos">' + (entry.pos || 'word') + '</div>'
    + '<div class="dict-definition"><strong>1.</strong> ' + entry.def + '</div>'
    + (entry.ex ? '<div class="dict-example">' + entry.ex + '</div>' : '')
    + (syns ? '<div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-l);margin:8px 0 5px;">Synonyms</div><div class="dict-synonyms">' + syns + '</div>' : '')
    + '<div style="font-size:11px;color:var(--text-l);margin-top:8px;">📚 Local dictionary • '
    + '<a href="https://en.wiktionary.org/wiki/' + enc + '" target="_blank" style="color:var(--blue);">Wiktionary</a> for more</div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">'
    + '<a href="https://www.google.com/search?q=define+' + enc + '" target="_blank" class="dict-ext-btn dict-ext-g">🔍 Google</a>'
    + '<a href="https://www.merriam-webster.com/dictionary/' + enc + '" target="_blank" class="dict-ext-btn dict-ext-mw">📖 Merriam-Webster</a>'
    + '<a href="https://www.oxfordlearnersdictionaries.com/definition/english/' + enc + '" target="_blank" class="dict-ext-btn dict-ext-ox">🎓 Oxford</a>'
    + '</div>';
}

function playDictAudio(url) {
  try {
    new Audio(url).play();
  } catch(e) {
    toast('⚠️ Could not play audio');
  }
}

// ── TRANSLATE UI (Google-powered, no API) ──
let translateTargetLang = 'ta'; // default: Tamil

function showTranslateUI(text) {
  // Switch to translate tab
  switchTab('translate');

  // Show the text in the panel
  const orig = document.getElementById('tr-original');
  if (orig) orig.textContent = text || 'Type or select text to translate';

  // Build Google Translate URL
  updateTranslateLinks(text);
}

function updateTranslateLinks(text) {
  const enc = encodeURIComponent(text || '');
  const lang = translateTargetLang;

  // Google Translate: auto-detect source, translate to selected target
  const gtUrl = 'https://translate.google.com/?sl=auto&tl=' + lang + '&text=' + enc + '&op=translate';
  const btn = document.getElementById('tr-open-btn');
  if (btn) btn.href = gtUrl;

  // DeepL — use direct URL with text if possible
  const deepLUrl = 'https://www.deepl.com/translator#auto/' + lang + '/' + enc;
  const deepLBtn = document.getElementById('tr-deepl-btn');
  if (deepLBtn) deepLBtn.href = deepLUrl;
}

function setTranslateLang(btn) {
  // Update active button
  document.querySelectorAll('.tr-lang-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  translateTargetLang = btn.dataset.lang;

  // Refresh links with new target language
  const text = document.getElementById('tr-original')?.textContent || '';
  if (text && text !== 'Type or select text to translate') {
    updateTranslateLinks(text);
  }
}

// ── SEARCH LINKS ──
function updateSearchLinks(term) {
  const t = term || '';
  document.getElementById('search-term').textContent = t || 'your topic';
  const enc = encodeURIComponent(t);
  document.getElementById('sl-g').href = 'https://www.google.com/search?q=' + enc;
  document.getElementById('sl-w').href = 'https://en.wikipedia.org/wiki/Special:Search?search=' + enc;
  document.getElementById('sl-k').href = 'https://www.khanacademy.org/search?page_search_query=' + enc;
  document.getElementById('sl-y').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(t + ' for kids');
}

// ── GEMINI TEXT API ──
async function callGemini(type, text) {
  // Translate uses Google — no Gemini quota needed
  if (type === 'translate') { showTranslateUI(text); return; }
  const msgs = { explain: 'Creating explanation…', quiz: 'Building quiz…' };
  const subs = { explain: 'Making it child-friendly', quiz: 'Writing a fun question' };
  document.getElementById('load-msg').textContent = msgs[type] || 'Asking Gemini…';
  document.getElementById('load-sub').textContent = subs[type] || '';
  ['empty-s','result-s','search-area','translate-area','notebook-area'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.getElementById('load-s').style.display = 'flex';

  const prompts = {
    explain: 'You are a warm, encouraging teacher explaining to a child aged 8-12.\nExplain: "' + text + '"\nUse a simple analogy or fun real-life example the child will relate to.\nReturn ONLY valid JSON, no markdown:\n{"explanation":"2-3 simple sentences with an analogy","keywords":["word1","word2","word3"],"funFact":"One amazing fun fact about this topic"}',
    quiz: 'Create a fun multiple-choice quiz question for a child aged 8-12 about: "' + text + '"\nReturn ONLY valid JSON, no markdown:\n{"question":"An engaging question","options":["Option A","Option B","Option C","Option D"],"correct":0,"explanation":"Simple explanation of the correct answer"}'
  };

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + getKey(),
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompts[type] }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 900 } }) }
    );
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || 'HTTP ' + res.status); }
    const data = await res.json();
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const s = raw.indexOf('{'), en = raw.lastIndexOf('}');
    if (s >= 0 && en > s) raw = raw.slice(s, en + 1);
    showResult(type, text, JSON.parse(raw));
    apiStatus.className = 'api-status ok';
  } catch (err) {
    showEmpty();
    const msg = err.message || '';
    const isKey = msg.toLowerCase().includes('key') || msg.includes('400') || msg.toLowerCase().includes('invalid') || msg.includes('UNAUTHENTICATED');
    toast('❌ ' + (isKey ? 'Invalid API key. Get one free at aistudio.google.com' : msg.includes('quota') ? 'API quota exceeded. Try again later.' : msg.slice(0, 90)), 4000);
    apiStatus.className = 'api-status bad';
  }
}

// ── GEMINI WITH IMAGE ──
async function callGeminiWithImage() {
  if (!pages.length) return;
  showLoading('Analysing image…', 'Understanding the lesson content');
  const dataUrl = pages[curPage].dataUrl;
  const b64 = dataUrl.split(',')[1];
  const mime = (dataUrl.match(/data:([^;]+);/) || [])[1] || 'image/jpeg';
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + getKey(),
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [
          { inline_data: { mime_type: mime, data: b64 } },
          { text: 'You are a teacher explaining a lesson image to a child aged 8-12. Describe what this image teaches in simple, fun language.\nReturn ONLY valid JSON:\n{"explanation":"Simple explanation of what this image teaches","keywords":["w1","w2","w3"],"funFact":"One fun fact"}' }
        ]}], generationConfig: { temperature: 0.7, maxOutputTokens: 700 } }) }
    );
    if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || ''); }
    const data = await res.json();
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    raw = raw.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
    const s = raw.indexOf('{'), en = raw.lastIndexOf('}');
    if (s >= 0 && en > s) raw = raw.slice(s, en+1);
    switchTab('explain');
    showResult('explain', 'This image', JSON.parse(raw));
  } catch (e) { showEmpty(); toast('❌ ' + (e.message || '').slice(0, 80)); }
}
function showLoading(msg, sub) {
  document.getElementById('load-msg').textContent = msg || 'Thinking…';
  document.getElementById('load-sub').textContent = sub || '';
  ['empty-s','result-s','search-area','notebook-area'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  document.getElementById('load-s').style.display = 'flex';
}

// ── SHOW RESULT ──
function showResult(type, word, data) {
  document.getElementById('load-s').style.display = 'none';
  const tag    = document.getElementById('result-tag');
  const wordEl = document.getElementById('result-word');
  const scroll = document.getElementById('result-scroll');
  const rs     = document.getElementById('result-s');
  wordEl.textContent = word;
  rs.setAttribute('data-tab', type); rs.setAttribute('data-has', '1');

  if (type === 'explain') {
    tag.textContent = '🧠 Explanation'; tag.className = 'result-type-tag tag-explain';
    const keys = (data.keywords || []).map(k =>
      '<span class="kw-chip" onclick="runChip(\'' + k.replace(/'/g,"\\'") + '\',\'explain\')">' + k + '</span>').join('');
    scroll.innerHTML =
      '<div class="sec"><div class="sec-label">Simple Explanation</div><div class="info-card">' + (data.explanation || '') + '</div></div>' +
      (data.funFact ? '<div class="sec"><div class="sec-label">⭐ Fun Fact</div><div class="info-card green">' + data.funFact + '</div></div>' : '') +
      (keys ? '<div class="sec"><div class="sec-label">🔑 Key Words — click any to explore</div><div class="keywords">' + keys + '</div></div>' : '') +
      '<div class="sec"><div class="sec-label">🌐 Learn More (all free, new tab)</div><div class="ext-links">' +
        '<a class="ext-link g" href="https://www.google.com/search?q=' + encodeURIComponent(word) + '" target="_blank">🔍 Google</a>' +
        '<a class="ext-link w" href="https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(word) + '" target="_blank">📖 Wikipedia</a>' +
        '<a class="ext-link k" href="https://www.khanacademy.org/search?page_search_query=' + encodeURIComponent(word) + '" target="_blank">🎓 Khan Academy</a>' +
        '<a class="ext-link y" href="https://www.youtube.com/results?search_query=' + encodeURIComponent(word + ' for kids') + '" target="_blank">▶ YouTube</a>' +
      '</div></div>';

  } else if (type === 'translate') {
    tag.textContent = '🌍 Translation'; tag.className = 'result-type-tag tag-translate';
    scroll.innerHTML =
      '<div class="sec"><div class="sec-label">Detected: <strong>' + (data.detected_language || '?') + '</strong></div>' +
        '<div class="tblock"><div class="tblock-lbl">Original</div><div class="tblock-val">' + (data.original || word) + '</div>' +
        (data.pronunciation ? '<div class="tblock-pron">🔊 ' + data.pronunciation + '</div>' : '') + '</div></div>' +
      '<div class="sec"><div class="sec-label">Translation</div>' +
        '<div class="tblock"><div class="tblock-val translated">' + (data.translation || 'Not available') + '</div></div></div>' +
      '<div class="sec"><div class="sec-label">Translate More Online</div><div class="ext-links">' +
        '<a class="ext-link g" href="https://translate.google.com/?text=' + encodeURIComponent(word) + '&op=translate" target="_blank">🌐 Google Translate</a>' +
        '<a class="ext-link w" href="https://www.deepl.com/translator" target="_blank">🔤 DeepL</a>' +
      '</div></div>';

  } else if (type === 'quiz') {
    tag.textContent = '❓ Quick Quiz'; tag.className = 'result-type-tag tag-quiz';
    const correct = typeof data.correct === 'number' ? data.correct : 0;
    const opts = (data.options || []).map((o, i) =>
      '<button class="q-opt" onclick="answerQuiz(this,' + i + ',' + correct + ',\'' + (data.explanation||'').replace(/'/g,' ') + '\')">' +
      '<span class="q-letter">' + String.fromCharCode(65+i) + '</span>' + o + '</button>').join('');
    scroll.innerHTML =
      '<div class="sec"><div class="quiz-q">' + (data.question || '') + '</div>' +
      '<div class="quiz-options">' + opts + '</div>' +
      '<div class="quiz-feedback" id="quiz-fb"></div>' +
      '<button class="retry-btn" onclick="callGemini(\'quiz\',\'' + word.replace(/'/g,"\\'") + '\')">🔄 New question on same topic</button></div>';
  }
  rs.style.display = 'flex';
}

function answerQuiz(btn, chosen, correct, explanation) {
  btn.closest('.quiz-options').querySelectorAll('.q-opt').forEach((o, i) => {
    o.disabled = true;
    if (i === correct) o.classList.add('correct');
    else if (i === chosen) o.classList.add('wrong');
  });
  const fb = document.getElementById('quiz-fb');
  if (fb) {
    fb.textContent = (chosen === correct ? '✅ Correct! ' : '❌ Not quite — ') + explanation;
    fb.style.display = 'block';
    fb.style.borderColor = chosen === correct ? '#86efac' : '#fca5a5';
    fb.style.background = chosen === correct ? '#f0fdf4' : '#fff1f2';
    fb.style.color = chosen === correct ? '#15803d' : '#be123c';
  }
}

function runChip(word, type) {
  document.getElementById('q-field').value = word;
  selText = word;
  callGemini(type, word);
}

// ── NOTEBOOK ──
let nbFilterVal = 'all';
function getWords() { try { return JSON.parse(localStorage.getItem('lb_words3') || '[]'); } catch { return []; } }
function setWords(w) { localStorage.setItem('lb_words3', JSON.stringify(w)); }

async function saveWord(word) {
  const all = getWords();
  if (all.find(e => e.word.toLowerCase() === word.toLowerCase())) { toast('📒 Already in your Notebook!'); return; }
  const entry = { word, meaning: '', pronunciation: '', example: '', mastered: false, savedAt: Date.now(), loading: true };
  all.push(entry); setWords(all);
  switchTab('notebook'); renderNotebook();
  toast('📒 Saving "' + word.slice(0, 20) + '"… fetching definition');

  if (getKey()) {
    try {
      const prompt = 'Give a short dictionary entry for "' + word + '" for a child aged 8-12.\nReturn ONLY valid JSON, no markdown:\n{"pronunciation":"/phonetic/","meaning":"1-2 sentence simple definition","example":"One example sentence"}';
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + getKey(),
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 300 } }) }
      );
      if (res.ok) {
        const data = await res.json();
        let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        raw = raw.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
        const s = raw.indexOf('{'), en = raw.lastIndexOf('}');
        if (s >= 0 && en > s) raw = raw.slice(s, en+1);
        const parsed = JSON.parse(raw);
        const updated = getWords(); const idx = updated.findIndex(e => e.word === word);
        if (idx >= 0) { updated[idx] = { ...updated[idx], ...parsed, loading: false }; setWords(updated); renderNotebook(); }
        toast('✅ "' + word.slice(0,20) + '" saved with definition!');
      }
    } catch {
      const updated = getWords(); const idx = updated.findIndex(e => e.word === word);
      if (idx >= 0) { updated[idx].loading = false; setWords(updated); renderNotebook(); }
      toast('📒 Saved! (Definition fetch failed — check API key)');
    }
  } else {
    const updated = getWords(); const idx = updated.findIndex(e => e.word === word);
    if (idx >= 0) { updated[idx].loading = false; setWords(updated); renderNotebook(); }
    toast('📒 Saved! Add your API key to auto-fetch definitions.');
  }
}

function toggleMastered(word) {
  const all = getWords(); const idx = all.findIndex(e => e.word === word);
  if (idx >= 0) { all[idx].mastered = !all[idx].mastered; setWords(all); renderNotebook(); }
}
function deleteWord(word) { setWords(getWords().filter(e => e.word !== word)); renderNotebook(); }
function clearVocab() {
  if (!getWords().length) return;
  if (!confirm('Clear all saved words?')) return;
  setWords([]); renderNotebook(); toast('Notebook cleared');
}
function setNBFilter(btn, filter) {
  nbFilterVal = filter;
  document.querySelectorAll('.nb-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderNotebook();
}

function renderNotebook() {
  const all = getWords();
  const mastered = all.filter(e => e.mastered).length;
  document.getElementById('nb-cnt').textContent = all.length;
  document.getElementById('nb-mastered').textContent = mastered;
  const filtered = nbFilterVal === 'master' ? all.filter(e => e.mastered)
                 : nbFilterVal === 'new'    ? all.filter(e => !e.mastered) : all;
  const grid  = document.getElementById('nb-grid');
  const empty = document.getElementById('nb-empty');
  const pm    = document.getElementById('practice-mode');
  if (!grid || !empty) return;
  pm.style.display = 'none';
  if (!all.length) {
    grid.style.display = 'none'; empty.style.display = 'flex'; return;
  }
  empty.style.display = 'none';
  grid.style.display  = filtered.length ? 'grid' : 'none';
  grid.innerHTML = filtered.map(e => {
    const safeW = e.word.replace(/"/g, '&quot;');
    const cardCls = 'wd-card' + (e.mastered ? ' mastered' : '') + (e.loading ? ' loading' : '');
    const starCls = 'wd-star-btn' + (e.mastered ? ' on' : '');
    return '<div class="' + cardCls + '" data-word="' + safeW + '">' +
      '<div class="wd-top">' +
        '<div class="wd-word">' + e.word + '</div>' +
        '<button class="' + starCls + '" onclick="toggleMastered(this.closest(\'[data-word]\').dataset.word)">' + (e.mastered ? '⭐' : '☆') + '</button>' +
        '<button class="wd-del-btn" onclick="deleteWord(this.closest(\'[data-word]\').dataset.word)">✕</button>' +
      '</div>' +
      (e.pronunciation ? '<div class="wd-pronoun">' + e.pronunciation + '</div>' : '') +
      (e.loading ? '<div class="wd-bar"></div>' : '') +
      (e.meaning ? '<div class="wd-meaning">' + e.meaning + '</div>' : (!e.loading ? '<div class="wd-meaning" style="color:var(--text-l);font-style:italic">No definition yet — add API key</div>' : '')) +
      (e.example ? '<div class="wd-example">"' + e.example + '"</div>' : '') +
      '<div class="wd-actions">' +
        '<button class="wd-act-btn explain" onclick="vocabAct(this,\'explain\')">🧠 Explain</button>' +
        '<button class="wd-act-btn quiz"    onclick="vocabAct(this,\'dict\')">📚 Dictionary</button>' +
        '<button class="wd-act-btn"         onclick="speakText(this.closest(\'[data-word]\').dataset.word)">🔊 Say it</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function vocabAct(btn, type) {
  const word = btn.closest('[data-word]').dataset.word;
  if (!word) return;
  selText = word; document.getElementById('q-field').value = word;
  if (type === 'dict') { switchTab('dict'); lookupDictionary(word); return; }
  switchTab(type);
  if (needKey()) return;
  callGemini(type, word);
}

function exportVocab() {
  const all = getWords();
  if (!all.length) { toast('No words to export'); return; }
  let txt = 'MY WORD NOTEBOOK — LearnBuddy\n' + '='.repeat(40) + '\n\n';
  all.forEach((e, i) => {
    txt += (i+1) + '. ' + e.word.toUpperCase() + (e.pronunciation ? '  ' + e.pronunciation : '') + '\n';
    if (e.meaning)  txt += '   Meaning: ' + e.meaning + '\n';
    if (e.example)  txt += '   Example: "' + e.example + '"\n';
    if (e.mastered) txt += '   MASTERED ⭐\n';
    txt += '\n';
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
  a.download = 'my-word-notebook.txt'; a.click(); URL.revokeObjectURL(a.href);
  toast('📋 Word list exported!');
}

// ── PRACTICE MODE ──
function startPractice() {
  const eligible = getWords().filter(e => e.meaning);
  if (!eligible.length) { toast('⚠️ Save some words first and wait for definitions to load!'); return; }
  practiceQueue = [...eligible].sort(() => Math.random() - 0.5);
  practiceIdx = 0; practiceScore = 0;
  document.getElementById('nb-grid').style.display  = 'none';
  document.getElementById('nb-empty').style.display = 'none';
  document.getElementById('practice-mode').style.display = 'flex';
  showPracticeCard();
}
function showPracticeCard() {
  if (practiceIdx >= practiceQueue.length) { showPracticeResult(); return; }
  const e = practiceQueue[practiceIdx];
  const pct = Math.round(practiceIdx / practiceQueue.length * 100);
  document.getElementById('pr-fill').style.width = pct + '%';
  document.getElementById('pr-lbl').textContent = (practiceIdx+1) + ' / ' + practiceQueue.length;
  document.getElementById('pr-word').textContent = e.word;
  document.getElementById('pr-meaning').innerHTML = '<strong>Meaning:</strong> ' + e.meaning;
  document.getElementById('pr-example').textContent = e.example ? '"' + e.example + '"' : '';
  document.getElementById('pr-answer').style.display = 'none';
  document.getElementById('pr-reveal-wrap').style.display = '';
}
function revealPractice() {
  document.getElementById('pr-reveal-wrap').style.display = 'none';
  document.getElementById('pr-answer').style.display = 'flex';
}
function practiceMark(correct) {
  if (correct) { practiceScore++; toggleMastered(practiceQueue[practiceIdx].word); }
  practiceIdx++;
  if (practiceIdx < practiceQueue.length) showPracticeCard(); else showPracticeResult();
}
function showPracticeResult() {
  const total = practiceQueue.length;
  const pct = Math.round(practiceScore / total * 100);
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🌟' : pct >= 40 ? '💪' : '📚';
  const msg = pct === 100 ? 'Perfect score! Amazing work!' : pct >= 70 ? 'Great job! Keep it up!' : pct >= 40 ? 'Good effort — keep practising!' : 'Keep studying — you will get there!';
  document.getElementById('pr-fill').style.width = '100%';
  document.getElementById('pr-word').innerHTML = '<div style="text-align:center"><div style="font-size:60px">' + emoji + '</div><div style="font-size:26px;font-weight:900;color:var(--text-h);margin:10px 0">' + practiceScore + ' / ' + total + ' correct</div><div style="font-size:15px;font-weight:600;color:var(--text-m)">' + msg + '</div></div>';
  document.getElementById('pr-reveal-wrap').style.display = 'none';
  document.getElementById('pr-answer').style.display = 'none';
}
function endPractice() {
  document.getElementById('practice-mode').style.display = 'none';
  renderNotebook();
}

// ── TOAST ──
let toastTimer;
function toast(msg, duration) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), duration || 3200);
}

// ── FULLSCREEN (green dot) ──
document.querySelector('.logo-mark').addEventListener('dblclick', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
  else document.exitFullscreen().catch(()=>{});
});

// ═══════════════════════════════════════════════════
//  MAXIMIZE VIEW
// ═══════════════════════════════════════════════════
let maxWordBoxes = [];
let maxTab = 'search';
let maxTTSActive = false;

let maxResizeObs = null;
function openMaxView() {
  if (!pages.length) { toast('⚠️ Upload an image first'); return; }
  const overlay = document.getElementById('max-overlay');
  overlay.style.display = 'flex';
  renderMaxThumbs();
  loadMaxPage(curPage);
  switchMaxTab('search');

  // Refit canvas when container is resized (e.g. zoom level change)
  const wrap = document.getElementById('max-canvas-wrap');
  if (window.ResizeObserver) {
    if (maxResizeObs) maxResizeObs.disconnect();
    maxResizeObs = new ResizeObserver(() => {
      if (pages[curPage]) drawMaxCanvas();
    });
    maxResizeObs.observe(wrap);
  }
}

function closeMaxView() {
  document.getElementById('max-overlay').style.display = 'none';
  speechSynthesis.cancel(); maxTTSActive = false;
  const btn = document.getElementById('max-tts-btn');
  if (btn) { btn.textContent = '▶'; btn.classList.remove('playing'); }
  if (maxResizeObs) { maxResizeObs.disconnect(); maxResizeObs = null; }
}

function renderMaxThumbs() {
  const bar = document.getElementById('max-thumb-bar');
  bar.innerHTML = '';
  pages.forEach((p, i) => {
    const t = document.createElement('div');
    t.className = 'thumb' + (i === curPage ? ' active' : '');
    t.style.cssText = 'flex-shrink:0;width:44px;height:54px;border-radius:8px;border:2.5px solid var(--border);overflow:hidden;cursor:pointer;transition:all .16s;background:var(--bg-page);position:relative;';
    t.onclick = () => loadMaxPage(i);
    t.innerHTML = '<img src="' + p.dataUrl + '" style="width:100%;height:100%;object-fit:cover;" alt="pg' + (i+1) + '"><div style="position:absolute;bottom:2px;right:3px;font-size:9px;font-weight:800;color:white;background:rgba(0,0,0,.5);border-radius:3px;padding:0 3px">' + (i+1) + '</div>';
    bar.appendChild(t);
  });
}

function loadMaxPage(i) {
  curPage = i;
  maxWordBoxes = [];
  document.getElementById('max-pg-lbl').textContent = 'Page ' + (i+1) + ' of ' + pages.length;
  document.getElementById('max-status-text').textContent = 'Click "🔍 Map Words" to make text interactive';
  document.getElementById('max-sel-row').style.display = 'none';
  renderMaxThumbs();

  const canvas = document.getElementById('max-canvas');
  const wrap   = document.getElementById('max-canvas-wrap');
  const img = new Image();
  img.onload = () => {
    // Set internal drawing buffer = natural image size (for hit-test accuracy)
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Fit canvas visually inside the container — compute scale
    // Use requestAnimationFrame so the wrap has a measured layout size
    requestAnimationFrame(() => {
      const availW = wrap.clientWidth  - 16; // minus padding
      const availH = wrap.clientHeight - 16;
      if (availW > 0 && availH > 0) {
        const scale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight, 1);
        canvas.style.width  = Math.round(img.naturalWidth  * scale) + 'px';
        canvas.style.height = Math.round(img.naturalHeight * scale) + 'px';
      } else {
        // Fallback: just constrain by CSS
        canvas.style.width  = '100%';
        canvas.style.height = 'auto';
      }
    });

    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    initMaxCanvasEvents(canvas, img);
  };
  img.src = pages[i].dataUrl;
}

function drawMaxCanvas(hoverIdx, selRect) {
  const canvas = document.getElementById('max-canvas');
  const wrap   = document.getElementById('max-canvas-wrap');
  if (!canvas || !pages[curPage]) return;
  const img = new Image();
  img.onload = () => {
    // Recalculate fit in case container changed size (e.g. zoom)
    const availW = wrap.clientWidth  - 16;
    const availH = wrap.clientHeight - 16;
    if (availW > 0 && availH > 0) {
      const scale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight, 1);
      canvas.style.width  = Math.round(img.naturalWidth  * scale) + 'px';
      canvas.style.height = Math.round(img.naturalHeight * scale) + 'px';
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    maxWordBoxes.forEach((wb, i) => {
      if (wb.selected) {
        ctx.fillStyle = 'rgba(79,110,247,0.28)'; ctx.strokeStyle = '#4f6ef7'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(wb.x-2, wb.y-1, wb.w+4, wb.h+2, 3); ctx.fill(); ctx.stroke();
      } else if (i === hoverIdx) {
        ctx.fillStyle = 'rgba(245,158,11,0.2)'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(wb.x-2, wb.y-1, wb.w+4, wb.h+2, 3); ctx.fill(); ctx.stroke();
      }
    });
    if (selRect) {
      ctx.fillStyle = 'rgba(79,110,247,0.12)'; ctx.strokeStyle = '#4f6ef7'; ctx.lineWidth = 2;
      ctx.setLineDash([5,3]); ctx.strokeRect(selRect.x, selRect.y, selRect.w, selRect.h);
      ctx.fillRect(selRect.x, selRect.y, selRect.w, selRect.h); ctx.setLineDash([]);
    }
  };
  img.src = pages[curPage].dataUrl;
}

let maxDragging = false, maxDragStart = {x:0,y:0};
function initMaxCanvasEvents(canvas) {
  if (canvas._maxEventsAttached) return;
  canvas._maxEventsAttached = true;
  let hoverIdx = -1;

  function toImgCoords(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
  }
  function hitTestMax(x, y) {
    for (let i = 0; i < maxWordBoxes.length; i++) {
      const b = maxWordBoxes[i];
      if (x >= b.x-4 && x <= b.x+b.w+4 && y >= b.y-4 && y <= b.y+b.h+4) return i;
    }
    return -1;
  }
  function wordsInRectMax(rx, ry, rw, rh) {
    const x0=Math.min(rx,rx+rw),x1=Math.max(rx,rx+rw),y0=Math.min(ry,ry+rh),y1=Math.max(ry,ry+rh);
    return maxWordBoxes.reduce((acc,wb,i)=>{ const cx=wb.x+wb.w/2,cy=wb.y+wb.h/2; if(cx>=x0&&cx<=x1&&cy>=y0&&cy<=y1) acc.push(i); return acc; },[]);
  }

  canvas.addEventListener('mousemove', e => {
    if (maxDragging) { const c=toImgCoords(e); drawMaxCanvas(-1,{x:maxDragStart.x,y:maxDragStart.y,w:c.x-maxDragStart.x,h:c.y-maxDragStart.y}); return; }
    const {x,y}=toImgCoords(e); const idx=hitTestMax(x,y);
    if (idx!==hoverIdx) { hoverIdx=idx; canvas.style.cursor=idx>=0?'pointer':'crosshair'; drawMaxCanvas(hoverIdx); }
  });
  canvas.addEventListener('mousedown', e => { if(e.button!==0)return; maxDragging=true; maxDragStart=toImgCoords(e); });
  canvas.addEventListener('mouseup', e => {
    if (!maxDragging) return; maxDragging=false;
    const end=toImgCoords(e);
    const dx=Math.abs(end.x-maxDragStart.x), dy=Math.abs(end.y-maxDragStart.y);
    if (dx<8&&dy<8) {
      const idx=hitTestMax(end.x,end.y);
      maxWordBoxes.forEach(w=>w.selected=false);
      if (idx>=0) { maxWordBoxes[idx].selected=true; drawMaxCanvas(); onMaxWordsSelected([maxWordBoxes[idx].text]); }
      else { drawMaxCanvas(); document.getElementById('max-sel-row').style.display='none'; }
    } else {
      const indices=wordsInRectMax(maxDragStart.x,maxDragStart.y,end.x-maxDragStart.x,end.y-maxDragStart.y);
      maxWordBoxes.forEach((w,i)=>w.selected=indices.includes(i)); drawMaxCanvas();
      if (indices.length) onMaxWordsSelected(indices.map(i=>maxWordBoxes[i].text));
    }
  });
  canvas.addEventListener('mouseleave', ()=>{ if(maxDragging){maxDragging=false;drawMaxCanvas();} hoverIdx=-1;drawMaxCanvas(); });
}

function onMaxWordsSelected(words) {
  const text = words.filter(w=>w.length>1).join(' ').trim();
  if (!text) return;
  selText = text;
  document.getElementById('max-q-field').value = text;
  document.getElementById('max-sel-text').textContent = text;
  document.getElementById('max-sel-row').style.display = 'flex';
}

function useMaxSelected() {
  const t = document.getElementById('max-sel-text').textContent.trim();
  if (!t) return;
  selText = t;
  if (maxTab === 'search') { updateMaxSearch(t); return; }
  if (needKey()) return;
  callGeminiMax(maxTab, t);
}

async function extractOCRMax() {
  if (!pages.length) return;
  const btn = document.getElementById('max-btn-extract');
  btn.disabled = true;
  document.getElementById('max-status-text').textContent = '⏳ Mapping words… 0%';

  try {
    const img = new Image(); img.src = pages[curPage].dataUrl;
    await new Promise(r => img.onload = r);
    const offscreen = document.createElement('canvas');
    offscreen.width = img.naturalWidth * 2; offscreen.height = img.naturalHeight * 2;
    const octx = offscreen.getContext('2d');
    octx.filter = 'contrast(1.25) brightness(1.06)';
    octx.drawImage(img, 0, 0, offscreen.width, offscreen.height);

    const result = await Tesseract.recognize(offscreen.toDataURL('image/png'), 'eng', {
      logger: m => { if (m.status==='recognizing text') document.getElementById('max-status-text').textContent = '⏳ Mapping… ' + Math.round(m.progress*100) + '%'; },
      tessedit_pageseg_mode: '6',
    });

    maxWordBoxes = (result.data.words||[]).filter(w=>{
      const t=w.text.trim(); if(t.length<2) return false;
      const a=(t.match(/[a-zA-Z0-9]/g)||[]).length; if(a/t.length<0.5) return false;
      return w.confidence>=30;
    }).map(w=>({ text:w.text.replace(/[^a-zA-Z0-9''\-.,!?]/g,'').trim(), x:w.bbox.x0/2, y:w.bbox.y0/2, w:(w.bbox.x1-w.bbox.x0)/2, h:(w.bbox.y1-w.bbox.y0)/2, selected:false })).filter(w=>w.text.length>0);

    extractedText = maxWordBoxes.map(w=>w.text).join(' ');
    drawMaxCanvas();
    document.getElementById('max-status-text').textContent = '✅ ' + maxWordBoxes.length + ' words mapped — click or drag to select!';
    toast('✅ Words mapped on maximized view!');
  } catch(e) {
    document.getElementById('max-status-text').textContent = '❌ Failed: ' + (e.message||'').slice(0,60);
  }
  btn.disabled = false;
}

function toggleTTSMax() {
  if (maxTTSActive) { speechSynthesis.cancel(); maxTTSActive=false; const b=document.getElementById('max-tts-btn'); b.textContent='▶'; b.classList.remove('playing'); return; }
  if (!extractedText) { toast('Map words first'); return; }
  const u = new SpeechSynthesisUtterance(extractedText);
  u.rate=0.85; u.pitch=1.05; u.lang='en-US';
  u.onstart=()=>{ maxTTSActive=true; const b=document.getElementById('max-tts-btn'); b.textContent='⏹'; b.classList.add('playing'); };
  u.onend=u.onerror=()=>{ maxTTSActive=false; const b=document.getElementById('max-tts-btn'); if(b){b.textContent='▶';b.classList.remove('playing');} };
  speechSynthesis.speak(u);
}

function switchMaxTab(tab) {
  maxTab = tab;
  ['search','explain','translate','quiz'].forEach(t => {
    const el = document.getElementById('mtab-'+t); if(el) el.classList.toggle('active', t===tab);
  });
  const qb = document.getElementById('max-query-bar');
  if (qb) qb.style.display = tab==='search' ? '' : '';
  const phs = {search:'Search for any word…', explain:'Word to explain…', translate:'Text to translate…', quiz:'Topic for quiz…'};
  const mq = document.getElementById('max-q-field'); if(mq&&phs[tab]) mq.placeholder=phs[tab];
  if (tab==='search') { updateMaxSearch(document.getElementById('max-q-field').value||''); }
}

function goMaxQuery() {
  const t = document.getElementById('max-q-field').value.trim();
  if (!t) return;
  selText = t;
  if (maxTab==='search') { updateMaxSearch(t); return; }
  if (needKey()) return;
  callGeminiMax(maxTab, t);
}

function updateMaxSearch(term) {
  const enc = encodeURIComponent(term||'');
  const rc = document.getElementById('max-r-content');
  rc.innerHTML = '<div style="padding:16px 14px"><div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-l);margin-bottom:4px">Searching for</div>'
    + '<div style="font-size:18px;font-weight:900;color:var(--blue-d);margin-bottom:14px;word-break:break-word">' + (term||'your topic') + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
    + '<a class="search-card g" href="https://www.google.com/search?q='+enc+'" target="_blank"><div class="sc-em">🔍</div><div class="sc-title">Google</div></a>'
    + '<a class="search-card w" href="https://en.wikipedia.org/wiki/Special:Search?search='+enc+'" target="_blank"><div class="sc-em">📖</div><div class="sc-title">Wikipedia</div></a>'
    + '<a class="search-card k" href="https://www.khanacademy.org/search?page_search_query='+enc+'" target="_blank"><div class="sc-em">🎓</div><div class="sc-title">Khan Academy</div></a>'
    + '<a class="search-card y" href="https://www.youtube.com/results?search_query='+encodeURIComponent((term||'')+' for kids')+'" target="_blank"><div class="sc-em">▶️</div><div class="sc-title">YouTube</div></a>'
    + '</div><div style="font-size:11px;font-weight:600;color:var(--text-l);text-align:center">All links open free in a new tab</div></div>';
}

async function callGeminiMax(type, text) {
  const rc = document.getElementById('max-r-content');
  rc.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;gap:14px"><div class="loader"></div><div style="font-size:14px;font-weight:700;color:var(--text-m)">Asking Gemini…</div></div>';
  try {
    // Reuse main callGemini but render into max panel
    const prompts = {
      explain: 'You are a warm teacher for kids 8-12. Explain: "' + text + '". Return ONLY valid JSON no markdown: {"explanation":"2-3 simple sentences","keywords":["w1","w2","w3"],"funFact":"One fun fact"}',
      translate: 'Detect language, translate to English if not English, else to Tamil. Text: "' + text + '". Return ONLY JSON: {"detected_language":"lang","translation":"text","pronunciation":"phonetic if non-English"}',
      quiz: 'Make a fun quiz for a child about "' + text + '". Return ONLY JSON: {"question":"question","options":["A","B","C","D"],"correct":0,"explanation":"explanation"}'
    };
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key='+getKey(),
      { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({contents:[{parts:[{text:prompts[type]}]}],generationConfig:{temperature:0.7,maxOutputTokens:700}}) });
    if (!res.ok) { const e=await res.json(); throw new Error(e.error?.message||'Error'); }
    const data = await res.json();
    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text||'{}';
    raw = raw.replace(/```json\s*/gi,'').replace(/```\s*/gi,'').trim();
    const s=raw.indexOf('{'),en=raw.lastIndexOf('}'); if(s>=0&&en>s) raw=raw.slice(s,en+1);
    const d = JSON.parse(raw);

    // Render result into max panel
    const enc = encodeURIComponent(text);
    if (type==='explain') {
      const keys = (d.keywords||[]).map(k=>'<span class="kw-chip" onclick="document.getElementById(\'max-q-field\').value=\''+k+'\';callGeminiMax(\'explain\',\''+k+'\')">'+k+'</span>').join('');
      rc.innerHTML = '<div style="padding:16px 14px">'
        +'<div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-l);margin-bottom:6px">Explanation</div>'
        +'<div class="info-card" style="margin-bottom:12px">'+(d.explanation||'')+'</div>'
        +(d.funFact?'<div class="info-card green" style="margin-bottom:12px">⭐ '+d.funFact+'</div>':'')
        +(keys?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">'+keys+'</div>':'')
        +'<div class="ext-links"><a class="ext-link g" href="https://www.google.com/search?q='+enc+'" target="_blank">🔍 Google</a>'
        +'<a class="ext-link y" href="https://www.youtube.com/results?search_query='+encodeURIComponent(text+' for kids')+'" target="_blank">▶ YouTube</a></div></div>';
    } else if (type==='translate') {
      rc.innerHTML = '<div style="padding:16px 14px">'
        +'<div class="tblock" style="margin-bottom:10px"><div class="tblock-lbl">Detected: '+( d.detected_language||'?')+'</div><div class="tblock-val">'+text+'</div>'+(d.pronunciation?'<div class="tblock-pron">🔊 '+d.pronunciation+'</div>':'')+'</div>'
        +'<div class="tblock"><div class="tblock-lbl">Translation</div><div class="tblock-val translated">'+(d.translation||'')+'</div></div></div>';
    } else if (type==='quiz') {
      const correct=typeof d.correct==='number'?d.correct:0;
      const opts=(d.options||[]).map((o,i)=>'<button class="q-opt" onclick="answerQuiz(this,'+i+','+correct+',\''+(d.explanation||'').replace(/'/g,' ')+'\')">'
        +'<span class="q-letter">'+String.fromCharCode(65+i)+'</span>'+o+'</button>').join('');
      rc.innerHTML = '<div style="padding:16px 14px"><div class="quiz-q">'+(d.question||'')+'</div><div class="quiz-options">'+opts+'</div><div class="quiz-feedback" id="quiz-fb"></div></div>';
    }
  } catch(e) {
    rc.innerHTML = '<div style="padding:20px;text-align:center;color:var(--rose);font-weight:700">❌ ' + (e.message||'').slice(0,80) + '</div>';
  }
}

// Keyboard shortcut: Escape to close max view
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('max-overlay').style.display !== 'none') closeMaxView();
});

// ── INIT ──
switchTab('search');
renderNotebook();
updateSearchLinks('');