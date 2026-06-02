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
let _pendingActionAfterKey = null; // stores the callback to run after key is saved

function needKey(pendingAction) {
  if (getKey() && getKey().length >= 10) return false; // key already set — all good
  // Store the action to resume after user saves their key
  _pendingActionAfterKey = pendingAction || null;
  openApiModal();
  return true;
}

// ── API KEY MODAL ──
function openApiModal() {
  const modal = document.getElementById('api-key-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  // Pre-fill if there's already a partial key
  const inp = document.getElementById('modal-api-input');
  if (inp) { inp.value = apiInput.value.trim(); onModalKeyInput(inp); inp.focus(); }
}
function closeApiModal() {
  const modal = document.getElementById('api-key-modal');
  if (modal) modal.style.display = 'none';
  _pendingActionAfterKey = null;
}
function onModalKeyInput(inp) {
  const v = inp.value.trim();
  const ok = v.length > 15 && (v.startsWith('AIza') || v.startsWith('AI'));
  const status = document.getElementById('modal-key-status');
  const btn    = document.getElementById('modal-save-btn');
  if (status) {
    status.textContent = ok ? '✅ Key looks valid!' : v.length > 4 ? '⚠️ Key should start with "AIza…"' : '';
    status.style.color = ok ? '#16a34a' : '#d97706';
  }
  if (btn) btn.style.opacity = ok ? '1' : '0.6';
}
function saveApiKey() {
  const inp = document.getElementById('modal-api-input');
  const v   = inp ? inp.value.trim() : '';
  if (!v || v.length < 10) { toast('⚠️ Please paste a valid Gemini API key'); return; }
  // Save to main header input + localStorage
  apiInput.value = v;
  try { localStorage.setItem('lb_key', v); } catch {}
  checkKey();
  closeApiModal();
  toast('✅ API key saved! Running your request…', 2500);
  // Resume the action that triggered the modal
  if (typeof _pendingActionAfterKey === 'function') {
    setTimeout(_pendingActionAfterKey, 300);
    _pendingActionAfterKey = null;
  }
}
// Close modal on backdrop click
document.addEventListener('click', e => {
  const modal = document.getElementById('api-key-modal');
  if (modal && e.target === modal) closeApiModal();
});

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
    // Persist to localStorage so the image survives a page refresh
    // Debounced so multi-page PDFs only trigger one save at the end
    clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(saveSessionToLS, 400);
  } catch (e) {
    toast('❌ Error loading image: ' + (e.message || e));
    console.error(e);
  }
}
let _saveDebounceTimer = null;

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
  saveSessionToLS();
  toast('🗑 Page ' + (i+1) + ' removed');
}

function showPage(i) {
  curPage = i;
  wordBoxes = []; extractedText = ''; currentSelectedWords = [];
  // Save current page index so refresh restores to same page
  try { localStorage.setItem('lb_curpage', String(i)); } catch {}
  canvasZoom = 1.0; // reset zoom on page change
  clearSelDisplay();
  document.getElementById('pg-lbl').textContent = 'Page ' + (i+1) + ' of ' + pages.length;
  renderThumbs();
  setStatus('default', 'Click "🔍 Map Words" to make the text interactive on page ' + (i+1));

  // Load image into hidden img, then draw on canvas
  const img = document.getElementById('cur-img');
  const canvas = document.getElementById('lesson-canvas');
  img.onload = () => {
    // Set canvas internal buffer = natural image size
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.style.display = 'block';

    // Reset zoom and fit canvas to viewer container
    canvasZoom = 1.0;
    fitCanvasToViewer();

    drawCanvas();
    initCanvasEvents();
  };
  img.src = pages[i].dataUrl;
}

function clearAll(skipConfirm) {
  if (!skipConfirm && !confirm('Remove all pages and start over?')) return;
  pages = []; curPage = 0; extractedText = '';
  clearSessionLS();
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
    // Auto-navigate to lesson viewer if on home screen or another workspace
    const lessonWs = document.getElementById('workspace-lesson');
    if (!lessonWs || lessonWs.style.display === 'none') {
      if (typeof openSubject === 'function') openSubject('lesson');
    }
    addPage(ev.target.result, 'Screenshot ' + (pages.length + 1));
    toast('📸 Screenshot added! Navigated to Lesson Viewer.');
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

// ── PERSISTENCE — save/restore lesson pages across refresh ──
const LS_PAGES   = 'lb_pages_v2';   // JSON array of {dataUrl, name}
const LS_CURPAGE = 'lb_curpage';
const LS_WORDS   = 'lb_wordboxes';  // word boxes for current page
const LS_TEXT    = 'lb_text';       // extracted text for current page

function saveSessionToLS() {
  try {
    // Save pages (base64 images — already compressed to JPEG 88%)
    localStorage.setItem(LS_PAGES,   JSON.stringify(pages));
    localStorage.setItem(LS_CURPAGE, String(curPage));
    // Save word state for current page
    localStorage.setItem(LS_WORDS,   JSON.stringify(wordBoxes));
    localStorage.setItem(LS_TEXT,    extractedText);
  } catch (e) {
    // localStorage can throw if quota exceeded (large images)
    // Silently try saving just the current page only
    try {
      const single = pages[curPage] ? [pages[curPage]] : [];
      localStorage.setItem(LS_PAGES,   JSON.stringify(single));
      localStorage.setItem(LS_CURPAGE, '0');
      console.warn('LocalStorage quota hit — saved only current page');
    } catch (e2) {
      console.warn('LocalStorage full — could not save session');
    }
  }
}

function clearSessionLS() {
  [LS_PAGES, LS_CURPAGE, LS_WORDS, LS_TEXT].forEach(k => localStorage.removeItem(k));
}

function restoreSessionFromLS() {
  try {
    const raw = localStorage.getItem(LS_PAGES);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length === 0) return;

    // Restore pages array
    pages = saved.filter(p => p && p.dataUrl);
    if (!pages.length) return;

    // Restore current page index
    const savedPage = parseInt(localStorage.getItem(LS_CURPAGE) || '0');
    curPage = Math.min(Math.max(0, savedPage), pages.length - 1);

    // Restore word boxes and extracted text for current page
    const savedBoxes = localStorage.getItem(LS_WORDS);
    const savedText  = localStorage.getItem(LS_TEXT);
    if (savedBoxes) { try { wordBoxes = JSON.parse(savedBoxes); } catch {} }
    if (savedText)  { extractedText = savedText; }

    // Rebuild UI
    document.getElementById('upload-area').style.display   = 'none';
    document.getElementById('thumb-bar').style.display     = 'flex';
    document.getElementById('viewer').style.display        = 'flex';
    document.getElementById('status-bar').style.display    = 'flex';
    document.getElementById('btn-extract').style.display   = '';
    document.getElementById('btn-pdf').style.display       = '';
    document.getElementById('btn-clr').style.display       = '';
    document.getElementById('btn-max').style.display       = '';

    renderThumbs();
    showPage(curPage);

    // If word boxes were restored, show status
    if (wordBoxes.length) {
      setStatus('success', wordBoxes.length + ' words mapped — click or drag to select');
    }

    toast('📂 Lesson restored from last session');
  } catch (e) {
    console.warn('Could not restore session:', e);
    clearSessionLS();
  }
}


let canvasZoom  = 1.0;     // current zoom level (1 = fit-to-container)
let canvasOffX  = 0;       // pan offset X (not used yet, reserved)
let canvasOffY  = 0;       // pan offset Y
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
    saveSessionToLS(); // persist word boxes so they survive a refresh

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

  // ── SCROLL TO ZOOM (canvas only, not the page) ──
  // Attach to the scroll wrapper so the wheel is captured before it scrolls
  const scrollWrap = document.getElementById('canvas-scroll-wrap');
  if (scrollWrap) {
    scrollWrap.addEventListener('wheel', e => {
      e.preventDefault();
      // Mouse position relative to the scroll container
      const rect    = scrollWrap.getBoundingClientRect();
      const mouseX  = e.clientX - rect.left;
      const mouseY  = e.clientY - rect.top;
      const prevZoom = canvasZoom;

      const factor = e.deltaY < 0 ? 1.1 : 0.91; // smooth multiplicative step
      canvasZoom = Math.min(8.0, Math.max(0.2, canvasZoom * factor));

      applyCanvasZoom(mouseX, mouseY, prevZoom);
    }, { passive: false });
  }
}


// ── Fit canvas to viewer on first load (zoom = 1 = fill container) ──
function fitCanvasToViewer() {
  const canvas    = document.getElementById('lesson-canvas');
  const scaleWrap = document.getElementById('canvas-scale-wrap');
  const scrollWrap= document.getElementById('canvas-scroll-wrap');
  if (!canvas || !scaleWrap || !scrollWrap) return;
  if (!canvas.width || !canvas.height) return;

  // Available space (subtract padding)
  const availW = scrollWrap.clientWidth  - 24;
  const availH = scrollWrap.clientHeight - 24;

  // Compute fit scale — how much to scale to fill the container
  const fitScale = Math.min(availW / canvas.width, availH / canvas.height, 1);

  // Store as the "100% zoom" base. canvasZoom=1 means fitScale.
  // We encode this into the CSS directly on the scale wrap.
  scaleWrap.style.width  = canvas.width  + 'px';
  scaleWrap.style.height = canvas.height + 'px';
  scaleWrap.style.transform = 'scale(' + fitScale + ')';

  // Save fitScale so applyCanvasZoom can compute relative to it
  canvas._fitScale = fitScale;
  canvasZoom = 1.0; // zoom=1 means "fit to window"

  // Center in scroll container (no scrollbars at zoom=1)
  scrollWrap.classList.remove('zoomed');
  scrollWrap.scrollLeft = 0;
  scrollWrap.scrollTop  = 0;
}

function applyCanvasZoom(pivotX, pivotY, prevZoom) {
  const canvas     = document.getElementById('lesson-canvas');
  const scaleWrap  = document.getElementById('canvas-scale-wrap');
  const scrollWrap = document.getElementById('canvas-scroll-wrap');
  if (!canvas || !scaleWrap || !scrollWrap) return;
  if (!canvas.width || !canvas.height) return;

  // The actual scale = fitScale * canvasZoom
  // fitScale makes image fill the container at zoom=1
  const fitScale   = canvas._fitScale || Math.min(
    (scrollWrap.clientWidth  - 24) / canvas.width,
    (scrollWrap.clientHeight - 24) / canvas.height, 1
  );
  const totalScale = fitScale * canvasZoom;

  scaleWrap.style.width     = canvas.width  + 'px';
  scaleWrap.style.height    = canvas.height + 'px';
  scaleWrap.style.transform = 'scale(' + totalScale + ')';

  // Compute actual rendered pixel size for scrollbar spacer
  const renderedW = Math.round(canvas.width  * totalScale);
  const renderedH = Math.round(canvas.height * totalScale);

  // Switch scroll alignment: centered when fits, top-left when overflows
  const viewW = scrollWrap.clientWidth  - 24;
  const viewH = scrollWrap.clientHeight - 24;
  if (renderedW > viewW || renderedH > viewH) {
    scrollWrap.classList.add('zoomed'); // align top-left, enables scrollbars
  } else {
    scrollWrap.classList.remove('zoomed'); // keep centered
  }

  // Spacer forces the scroll container to create scrollbars of the right size
  let spacer = document.getElementById('canvas-spacer');
  if (!spacer) {
    spacer = document.createElement('div');
    spacer.id = 'canvas-spacer';
    spacer.style.cssText = 'flex-shrink:0;pointer-events:none;';
    scrollWrap.appendChild(spacer);
  }
  spacer.style.width  = (renderedW + 24) + 'px';
  spacer.style.height = (renderedH + 24) + 'px';

  // Zoom toward mouse pivot point (keep the point under cursor stationary)
  if (pivotX !== undefined && prevZoom !== undefined && prevZoom !== canvasZoom) {
    const prevTotal  = fitScale * prevZoom;
    const zoomRatio  = totalScale / prevTotal;
    scrollWrap.scrollLeft = Math.round((scrollWrap.scrollLeft + pivotX) * zoomRatio - pivotX);
    scrollWrap.scrollTop  = Math.round((scrollWrap.scrollTop  + pivotY) * zoomRatio - pivotY);
  }

  // Show zoom badge
  showZoomBadge(Math.round(canvasZoom * 100) + '%');
}

// Keyboard zoom shortcuts: Ctrl+= zoom in, Ctrl+- zoom out, Ctrl+0 reset
document.addEventListener('keydown', e => {
  const canvas = document.getElementById('lesson-canvas');
  if (!canvas || !canvas.style.display || canvas.style.display === 'none') return;
  if (e.ctrlKey || e.metaKey) {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      canvasZoom = Math.min(8.0, canvasZoom * 1.15);
      applyCanvasZoom();
    } else if (e.key === '-') {
      e.preventDefault();
      canvasZoom = Math.max(0.2, canvasZoom * 0.87);
      applyCanvasZoom();
    } else if (e.key === '0') {
      e.preventDefault();
      canvasZoom = 1.0;
      resetCanvasZoom();
      applyCanvasZoom();
    }
  }
});

// Reset zoom when page changes
function resetCanvasZoom() {
  canvasZoom = 1.0;
  fitCanvasToViewer();
  const spacer = document.getElementById('canvas-spacer');
  if (spacer) spacer.remove();
}

// Transient zoom badge
let zoomBadgeTimer;
function showZoomBadge(text) {
  let badge = document.getElementById('zoom-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'zoom-badge';
    badge.style.cssText = [
      'position:fixed','bottom:80px','left:50%','transform:translateX(-50%)',
      'background:rgba(30,27,75,.82)','color:white','font-family:var(--font)',
      'font-size:14px','font-weight:800','padding:7px 18px','border-radius:100px',
      'pointer-events:none','z-index:9999','transition:opacity .3s','opacity:1'
    ].join(';');
    document.body.appendChild(badge);
  }
  badge.textContent = '🔍 ' + text;
  badge.style.opacity = '1';
  clearTimeout(zoomBadgeTimer);
  zoomBadgeTimer = setTimeout(() => { badge.style.opacity = '0'; }, 1400);
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
  const _t1 = t, _tab1 = curTab;
  if (needKey(() => callGemini(_tab1, _t1))) return;
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
  const _w1 = word, _tab2 = curTab;
  if (needKey(() => callGemini(_tab2, _w1))) return;
  callGemini(curTab, word);
}

// ── IMAGE CONTEXT MENU ──
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
  if (type === 'explain') { if (!needKey(() => callGeminiWithImage())) callGeminiWithImage(); }
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
  const _t2 = t, _type2 = type;
  if (needKey(() => { switchTab(_type2); document.getElementById('q-field').value = _t2; callGemini(_type2, _t2); })) return;
  switchTab(type);
  document.getElementById('q-field').value = t;
  callGemini(type, t);
}

// ── TAB NAVIGATION ──
function switchTab(tab) {
  curTab = tab;
  try { localStorage.setItem('lb_tab', tab); } catch {}
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
    // Read tr-original (already set by showTranslateUI before it calls switchTab)
    // to avoid infinite recursion. Only call updateTranslateLinks, not showTranslateUI again.
    const orig = document.getElementById('tr-original');
    const origText = orig && orig.textContent !== 'Type or select text to translate' ? orig.textContent : '';
    const cur = origText || document.getElementById('q-field').value.trim() || selText || '';
    if (cur) {
      if (orig && !origText) orig.textContent = cur;
      updateTranslateLinks(cur);
    }
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
  if (curTab === 'search')    { updateSearchLinks(t); return; }
  if (curTab === 'translate') { showTranslateUI(t); return; }
  if (curTab === 'dict')      { lookupDictionary(t); return; }
  if (curTab === 'notebook')  { switchTab('explain'); }
  // explain or quiz — needs Gemini key
  const _t3 = t, _tab3 = curTab === 'explain' ? 'explain' : 'explain';
  if (needKey(() => callGemini(_tab3, _t3))) return;
  callGemini(_tab3, t);
}

// ── DICTIONARY LOOKUP (Free Dictionary API — no key needed) ──


// ── LOCAL DICTIONARY — 322 built-in educational words (offline fallback) ──
// Format: word → { pos, def, ex, syns }
// Used when all APIs fail or network is unavailable.
const LOCAL_DICT = {
  "abandon":{"pos":"verb","def":"To leave someone or something behind permanently.","ex":"The explorers had to abandon their ship in the storm.","syns":["leave", "desert", "forsake"]},
  "abbreviation":{"pos":"noun","def":"A shortened form of a word or phrase.","ex":"'Dr.' is an abbreviation for 'Doctor'.","syns":["acronym", "short form", "contraction"]},
  "ability":{"pos":"noun","def":"The power or skill to do something.","ex":"She has the ability to solve hard problems.","syns":["skill", "talent", "capability"]},
  "absorb":{"pos":"verb","def":"To soak up or take in something.","ex":"A sponge absorbs water quickly.","syns":["soak up", "take in", "drink in"]},
  "abundance":{"pos":"noun","def":"A very large quantity of something.","ex":"There was an abundance of fruit in the harvest.","syns":["plenty", "wealth", "surplus"]},
  "accurate":{"pos":"adjective","def":"Correct and without mistakes.","ex":"Make sure your answers are accurate.","syns":["correct", "precise", "exact"]},
  "achieve":{"pos":"verb","def":"To successfully reach a goal through effort.","ex":"Hard work helped him achieve good grades.","syns":["accomplish", "attain", "reach"]},
  "acid":{"pos":"noun","def":"A chemical substance with a sour taste that reacts with bases.","ex":"Lemon juice contains a mild acid called citric acid.","syns":["corrosive", "solvent"]},
  "adapt":{"pos":"verb","def":"To change to suit a new situation.","ex":"Animals adapt to their environment over time.","syns":["adjust", "modify", "change"]},
  "adjacent":{"pos":"adjective","def":"Next to or close to something.","ex":"The library is adjacent to the school.","syns":["nearby", "neighboring", "adjoining"]},
  "adventure":{"pos":"noun","def":"An exciting or unusual experience.","ex":"The camping trip was a great adventure.","syns":["journey", "quest", "expedition"]},
  "affect":{"pos":"verb","def":"To have an impact or influence on something.","ex":"Rain can affect outdoor sports.","syns":["influence", "impact", "change"]},
  "agriculture":{"pos":"noun","def":"The practice of farming crops and raising animals.","ex":"Agriculture provides most of the world's food.","syns":["farming", "cultivation", "husbandry"]},
  "algorithm":{"pos":"noun","def":"A step-by-step set of rules for solving a problem.","ex":"A recipe is like an algorithm for cooking.","syns":["procedure", "method", "process"]},
  "alliance":{"pos":"noun","def":"A union of groups or nations for a common purpose.","ex":"The two countries formed an alliance for peace.","syns":["union", "partnership", "coalition"]},
  "altitude":{"pos":"noun","def":"The height of something above sea level.","ex":"Airplanes fly at a high altitude.","syns":["height", "elevation", "level"]},
  "analogy":{"pos":"noun","def":"A comparison between two things to explain one of them.","ex":"A heart is like a pump — that is an analogy.","syns":["comparison", "parallel", "likeness"]},
  "analyze":{"pos":"verb","def":"To examine something carefully to understand it.","ex":"Scientists analyze data to find patterns.","syns":["examine", "study", "investigate"]},
  "ancestor":{"pos":"noun","def":"A person from whom one is descended, earlier in history.","ex":"Her ancestor came to this country 200 years ago.","syns":["forefather", "predecessor", "forebear"]},
  "ancient":{"pos":"adjective","def":"Belonging to a very long time ago.","ex":"Ancient Egypt had many great pyramids.","syns":["old", "historical", "prehistoric"]},
  "angle":{"pos":"noun","def":"The space between two lines that meet at a point.","ex":"A right angle measures exactly 90 degrees.","syns":["corner", "degree", "measurement"]},
  "annotate":{"pos":"verb","def":"To add notes or comments to a text.","ex":"Annotate your book with questions as you read.","syns":["comment", "note", "mark"]},
  "annual":{"pos":"adjective","def":"Happening once every year.","ex":"The annual sports day is held in March.","syns":["yearly", "once-a-year", "regular"]},
  "antonym":{"pos":"noun","def":"A word that means the opposite of another.","ex":"Hot and cold are antonyms.","syns":["opposite", "contrast", "reverse"]},
  "apart":{"pos":"adverb","def":"Separated by a distance.","ex":"The two buildings were 100 meters apart.","syns":["away", "separated", "distant"]},
  "apply":{"pos":"verb","def":"To put something to use for a purpose.","ex":"Apply what you learn in school to real life.","syns":["use", "employ", "utilize"]},
  "appreciate":{"pos":"verb","def":"To recognize the value or quality of something.","ex":"I appreciate all the help you gave me.","syns":["value", "cherish", "admire"]},
  "area":{"pos":"noun","def":"The size of a surface, measured in square units.","ex":"The area of a rectangle is length times width.","syns":["surface", "space", "region"]},
  "argue":{"pos":"verb","def":"To give reasons for or against something.","ex":"Lawyers argue their case in court.","syns":["debate", "dispute", "contend"]},
  "arrange":{"pos":"verb","def":"To put things in a certain order.","ex":"Arrange the books by size on the shelf.","syns":["organize", "order", "sort"]},
  "artery":{"pos":"noun","def":"A blood vessel that carries blood away from the heart.","ex":"The aorta is the largest artery in the body.","syns":["vessel", "tube", "duct"]},
  "article":{"pos":"noun","def":"A piece of writing in a newspaper or magazine.","ex":"She read an article about climate change.","syns":["piece", "report", "story"]},
  "artifact":{"pos":"noun","def":"An object made by humans, especially from the past.","ex":"The museum displayed artifacts from ancient Rome.","syns":["relic", "object", "item"]},
  "assess":{"pos":"verb","def":"To evaluate or judge the quality of something.","ex":"Teachers assess students through tests and projects.","syns":["evaluate", "judge", "measure"]},
  "assist":{"pos":"verb","def":"To help someone with a task.","ex":"Please assist the younger students with their work.","syns":["help", "support", "aid"]},
  "atmosphere":{"pos":"noun","def":"The gases surrounding a planet; also the mood of a place.","ex":"Earth's atmosphere protects us from harmful rays.","syns":["air", "environment", "mood"]},
  "atom":{"pos":"noun","def":"The smallest unit of a chemical element.","ex":"Everything is made of atoms too small to see.","syns":["particle", "unit", "element"]},
  "attract":{"pos":"verb","def":"To cause someone or something to come closer.","ex":"Flowers attract bees with their sweet smell.","syns":["draw", "pull", "appeal"]},
  "authority":{"pos":"noun","def":"The right to give orders and make decisions.","ex":"The principal has authority over the school.","syns":["power", "control", "command"]},
  "average":{"pos":"noun","def":"The result of adding numbers and dividing by the count.","ex":"The average of 4, 6, and 8 is 6.","syns":["mean", "midpoint", "norm"]},
  "axis":{"pos":"noun","def":"An imaginary line around which something rotates.","ex":"Earth rotates on its axis once every 24 hours.","syns":["spindle", "pivot", "center line"]},
  "bacteria":{"pos":"noun","def":"Tiny single-celled organisms, some causing disease.","ex":"Bacteria can be helpful or harmful to humans.","syns":["microbes", "germs", "microorganisms"]},
  "balance":{"pos":"noun","def":"A steady position; equal distribution of weight.","ex":"She kept her balance while walking on the beam.","syns":["stability", "equilibrium", "steadiness"]},
  "barrier":{"pos":"noun","def":"Something that blocks or prevents progress.","ex":"The mountain was a natural barrier.","syns":["obstacle", "wall", "block"]},
  "behavior":{"pos":"noun","def":"The way a person or animal acts.","ex":"Good behavior is expected in the classroom.","syns":["conduct", "actions", "manner"]},
  "benefit":{"pos":"noun","def":"An advantage or helpful result.","ex":"Exercise has many health benefits.","syns":["advantage", "gain", "reward"]},
  "biodiversity":{"pos":"noun","def":"The variety of living species in an area.","ex":"Rainforests have the highest biodiversity on Earth.","syns":["variety", "species richness", "ecological diversity"]},
  "biography":{"pos":"noun","def":"The story of a person's life written by another.","ex":"I read a biography of Marie Curie.","syns":["life story", "memoir", "account"]},
  "boundary":{"pos":"noun","def":"A line that marks the edge of an area.","ex":"The river forms the boundary between the two states.","syns":["border", "edge", "limit"]},
  "boycott":{"pos":"verb","def":"To refuse to buy or use something as a protest.","ex":"People boycotted the company to demand fair wages.","syns":["protest", "refuse", "reject"]},
  "budget":{"pos":"noun","def":"A plan for how money will be spent.","ex":"We made a budget for the school trip.","syns":["plan", "financial plan", "allocation"]},
  "buoyancy":{"pos":"noun","def":"The ability of an object to float in water.","ex":"Wood has high buoyancy and floats easily.","syns":["floatation", "lightness", "lift"]},
  "calculate":{"pos":"verb","def":"To find out a number using mathematics.","ex":"Calculate the total by adding all the numbers.","syns":["compute", "figure", "count"]},
  "calendar":{"pos":"noun","def":"A chart showing the days, weeks, and months of a year.","ex":"Check the calendar for the date of the holiday.","syns":["planner", "schedule", "almanac"]},
  "camouflage":{"pos":"noun","def":"Colors or patterns that help animals blend into their surroundings.","ex":"The chameleon uses camouflage to hide from predators.","syns":["disguise", "concealment", "cover"]},
  "capable":{"pos":"adjective","def":"Having the ability to do something.","ex":"She is capable of solving complex problems.","syns":["able", "skilled", "competent"]},
  "capacity":{"pos":"noun","def":"The maximum amount something can hold or do.","ex":"The stadium has a capacity of 50,000 people.","syns":["volume", "limit", "ability"]},
  "capital":{"pos":"noun","def":"The city where a government is located; also money used for investment.","ex":"Washington D.C. is the capital of the United States.","syns":["main city", "headquarters", "seat of government"]},
  "carbon":{"pos":"noun","def":"A chemical element found in all living things.","ex":"Carbon dioxide is a gas plants use to make food.","syns":["element", "compound"]},
  "carnivore":{"pos":"noun","def":"An animal that eats only meat.","ex":"Lions are carnivores that hunt other animals.","syns":["meat-eater", "predator", "hunter"]},
  "cause":{"pos":"noun","def":"The reason something happens.","ex":"The cause of the fire was a candle.","syns":["reason", "source", "origin"]},
  "cell":{"pos":"noun","def":"The smallest basic unit of all living things.","ex":"The human body has trillions of cells.","syns":["unit", "building block", "organism unit"]},
  "century":{"pos":"noun","def":"A period of one hundred years.","ex":"The 21st century began in the year 2001.","syns":["100 years", "era", "period"]},
  "challenge":{"pos":"noun","def":"A difficult task that tests your abilities.","ex":"The math problem was a real challenge.","syns":["difficulty", "test", "obstacle"]},
  "character":{"pos":"noun","def":"The mental and moral qualities of a person.","ex":"She has a kind and honest character.","syns":["personality", "nature", "trait"]},
  "chart":{"pos":"noun","def":"A diagram showing information in an organized way.","ex":"The bar chart shows monthly rainfall totals.","syns":["graph", "diagram", "table"]},
  "chromosome":{"pos":"noun","def":"A structure in cells that carries genetic information.","ex":"Humans have 46 chromosomes in each cell.","syns":["gene carrier", "DNA strand"]},
  "chronological":{"pos":"adjective","def":"Arranged in order of time.","ex":"List the events in chronological order.","syns":["time-ordered", "sequential", "in order"]},
  "circumference":{"pos":"noun","def":"The distance around the outside of a circle.","ex":"The circumference of the Earth is about 40,000 km.","syns":["perimeter", "boundary", "edge"]},
  "citizen":{"pos":"noun","def":"A person belonging to a particular country.","ex":"Every citizen has rights and responsibilities.","syns":["resident", "inhabitant", "national"]},
  "civilization":{"pos":"noun","def":"A developed and organized human society.","ex":"Ancient Greek civilization influenced modern culture.","syns":["society", "culture", "community"]},
  "classify":{"pos":"verb","def":"To arrange things into groups by type.","ex":"We classify animals as mammals, birds, or fish.","syns":["categorize", "sort", "group"]},
  "climate":{"pos":"noun","def":"The usual weather conditions in an area.","ex":"The desert has a hot and dry climate.","syns":["weather", "conditions", "environment"]},
  "coefficient":{"pos":"noun","def":"A number placed before a variable in an equation.","ex":"In 3x, the number 3 is the coefficient.","syns":["multiplier", "factor", "constant"]},
  "collaborate":{"pos":"verb","def":"To work jointly with others on a project.","ex":"Students collaborate during group work.","syns":["cooperate", "work together", "partner"]},
  "colony":{"pos":"noun","def":"A group of people who settle in a new land; also a group of animals.","ex":"The colony of ants built a complex underground home.","syns":["settlement", "community", "outpost"]},
  "communicate":{"pos":"verb","def":"To share information with others.","ex":"We communicate through words, writing, and gestures.","syns":["express", "convey", "share"]},
  "community":{"pos":"noun","def":"A group of people living in the same area.","ex":"Our community works together to keep the park clean.","syns":["neighborhood", "society", "group"]},
  "compare":{"pos":"verb","def":"To look at two things to find similarities and differences.","ex":"Compare the two paragraphs and find the differences.","syns":["contrast", "examine", "evaluate"]},
  "compass":{"pos":"noun","def":"A tool that shows direction using a magnetic needle.","ex":"Use a compass to find which way is north.","syns":["direction finder", "navigator", "orienteer"]},
  "competition":{"pos":"noun","def":"A contest between people or groups.","ex":"She won the spelling competition.","syns":["contest", "rivalry", "tournament"]},
  "complex":{"pos":"adjective","def":"Made of many connected parts; not easy to understand.","ex":"The puzzle was complex and took hours to finish.","syns":["complicated", "difficult", "intricate"]},
  "compound":{"pos":"noun","def":"A substance made of two or more elements combined.","ex":"Water is a compound made of hydrogen and oxygen.","syns":["mixture", "combination", "blend"]},
  "conclude":{"pos":"verb","def":"To bring something to an end or to form an opinion.","ex":"We conclude the experiment by writing our findings.","syns":["end", "finish", "determine"]},
  "condensation":{"pos":"noun","def":"When water vapor turns into liquid water.","ex":"Condensation forms on a cold glass of water.","syns":["water formation", "droplets", "moisture"]},
  "conflict":{"pos":"noun","def":"A serious disagreement or fight.","ex":"The conflict between the two characters drives the story.","syns":["dispute", "struggle", "disagreement"]},
  "congruent":{"pos":"adjective","def":"Identical in shape and size.","ex":"These two triangles are congruent.","syns":["identical", "equal", "matching"]},
  "conservation":{"pos":"noun","def":"Protection of natural resources and the environment.","ex":"Conservation helps protect endangered species.","syns":["protection", "preservation", "sustainability"]},
  "constitution":{"pos":"noun","def":"The fundamental laws that govern a country.","ex":"The Constitution protects citizens' rights.","syns":["charter", "law", "framework"]},
  "context":{"pos":"noun","def":"The circumstances or background of an event.","ex":"Understanding context helps you read better.","syns":["setting", "background", "situation"]},
  "continent":{"pos":"noun","def":"One of the seven large land masses on Earth.","ex":"Africa is the second largest continent.","syns":["landmass", "region", "territory"]},
  "contrast":{"pos":"verb","def":"To show the differences between two things.","ex":"Contrast the two main characters in the story.","syns":["compare", "differentiate", "distinguish"]},
  "contribute":{"pos":"verb","def":"To give or add something to a group effort.","ex":"Everyone can contribute ideas to the project.","syns":["give", "add", "provide"]},
  "convection":{"pos":"noun","def":"The movement of heat through a liquid or gas.","ex":"Convection currents carry warm air upward.","syns":["heat transfer", "circulation", "flow"]},
  "cooperate":{"pos":"verb","def":"To work together toward a common goal.","ex":"Students cooperate during group projects.","syns":["collaborate", "work together", "help"]},
  "coordinate":{"pos":"noun","def":"A set of numbers that show a position on a grid.","ex":"The coordinate (3,5) shows a point on the graph.","syns":["position", "point", "location"]},
  "courage":{"pos":"noun","def":"The ability to do something scary or difficult.","ex":"It takes courage to stand up for what is right.","syns":["bravery", "boldness", "valor"]},
  "create":{"pos":"verb","def":"To bring something new into existence.","ex":"She used paint to create a beautiful picture.","syns":["make", "produce", "design"]},
  "culture":{"pos":"noun","def":"The ideas, customs, and social behaviour of a people.","ex":"Indian culture has a rich history of music and art.","syns":["society", "tradition", "heritage"]},
  "curious":{"pos":"adjective","def":"Eager to know or learn something.","ex":"Curious students ask lots of questions.","syns":["inquisitive", "interested", "questioning"]},
  "currency":{"pos":"noun","def":"The money used in a particular country.","ex":"The currency of Japan is the yen.","syns":["money", "cash", "coin"]},
  "cycle":{"pos":"noun","def":"A series of events that repeat in the same order.","ex":"The water cycle involves evaporation and rain.","syns":["loop", "rotation", "sequence"]},
  "data":{"pos":"noun","def":"Facts and statistics collected for reference or analysis.","ex":"The scientist collected data from the experiment.","syns":["information", "facts", "statistics"]},
  "debate":{"pos":"noun","def":"A formal discussion of opposing arguments.","ex":"The class held a debate about school uniforms.","syns":["discussion", "argument", "dispute"]},
  "decade":{"pos":"noun","def":"A period of ten years.","ex":"She has been teaching for over a decade.","syns":["ten years", "period", "era"]},
  "decimal":{"pos":"noun","def":"A number with a dot showing values less than one.","ex":"0.5 is a decimal equal to one half.","syns":["decimal point", "fraction", "part"]},
  "decompose":{"pos":"verb","def":"To break down into smaller parts or decay.","ex":"Dead leaves decompose and return nutrients to the soil.","syns":["decay", "rot", "break down"]},
  "deforestation":{"pos":"noun","def":"The cutting down of large areas of forest.","ex":"Deforestation destroys habitats and increases carbon dioxide.","syns":["logging", "clearing", "destruction"]},
  "democracy":{"pos":"noun","def":"A system of government where citizens vote for leaders.","ex":"In a democracy, every adult can vote.","syns":["republic", "self-governance", "representative government"]},
  "density":{"pos":"noun","def":"The amount of mass in a given volume.","ex":"Iron has a higher density than wood.","syns":["compactness", "thickness", "concentration"]},
  "describe":{"pos":"verb","def":"To say what something is like using words.","ex":"Describe your favorite animal in detail.","syns":["explain", "portray", "depict"]},
  "design":{"pos":"verb","def":"To plan and make something with a purpose.","ex":"She designed a bridge that could hold heavy loads.","syns":["create", "plan", "develop"]},
  "determine":{"pos":"verb","def":"To find out or decide something.","ex":"We must determine the cause of the problem.","syns":["find out", "decide", "establish"]},
  "develop":{"pos":"verb","def":"To grow or cause something to grow more advanced.","ex":"Reading every day helps develop vocabulary.","syns":["grow", "improve", "build"]},
  "diameter":{"pos":"noun","def":"A straight line through the center of a circle.","ex":"The diameter is twice the length of the radius.","syns":["width", "span", "measurement"]},
  "digest":{"pos":"verb","def":"To break down food in the body to get energy.","ex":"The stomach helps digest the food we eat.","syns":["process", "absorb", "break down"]},
  "discover":{"pos":"verb","def":"To find something for the first time.","ex":"Columbus discovered America in 1492.","syns":["find", "uncover", "explore"]},
  "diversity":{"pos":"noun","def":"The variety of people, things, or ideas in a group.","ex":"Our school celebrates cultural diversity.","syns":["variety", "difference", "range"]},
  "division":{"pos":"noun","def":"Splitting a number into equal parts.","ex":"12 divided by 3 equals 4 — that's division.","syns":["splitting", "sharing", "partition"]},
  "dominance":{"pos":"noun","def":"Power or influence over others.","ex":"The lion showed its dominance in the pride.","syns":["authority", "power", "control"]},
  "drought":{"pos":"noun","def":"A long period with very little or no rainfall.","ex":"The drought destroyed crops across the region.","syns":["dry spell", "water shortage", "aridity"]},
  "dynamic":{"pos":"adjective","def":"Constantly changing and full of energy.","ex":"The dynamic teacher kept students engaged.","syns":["energetic", "active", "lively"]},
  "earthquake":{"pos":"noun","def":"A sudden shaking of the ground caused by tectonic movement.","ex":"The earthquake damaged many buildings in the city.","syns":["tremor", "quake", "seismic event"]},
  "ecosystem":{"pos":"noun","def":"All living things and their environment in one area.","ex":"A pond ecosystem includes water, fish, plants, and insects.","syns":["habitat", "environment", "biome"]},
  "edition":{"pos":"noun","def":"A version of a published book or newspaper.","ex":"This is the third edition of the science textbook.","syns":["version", "copy", "print"]},
  "educate":{"pos":"verb","def":"To teach someone knowledge or skills.","ex":"Schools educate children in many subjects.","syns":["teach", "instruct", "train"]},
  "effective":{"pos":"adjective","def":"Producing the result that was wanted.","ex":"Exercise is an effective way to stay healthy.","syns":["successful", "useful", "efficient"]},
  "element":{"pos":"noun","def":"A substance that cannot be broken into simpler substances.","ex":"Gold is an element found in the periodic table.","syns":["substance", "component", "material"]},
  "emigrate":{"pos":"verb","def":"To leave one's country to live in another.","ex":"Many people emigrate in search of better opportunities.","syns":["leave", "move abroad", "relocate"]},
  "emperor":{"pos":"noun","def":"The ruler of an empire.","ex":"The Roman emperor had power over a vast territory.","syns":["ruler", "king", "monarch"]},
  "empire":{"pos":"noun","def":"A large group of countries ruled by one person or nation.","ex":"The British Empire once covered much of the world.","syns":["kingdom", "realm", "domain"]},
  "energy":{"pos":"noun","def":"Power that comes from physical or chemical resources.","ex":"The sun gives us energy through sunlight.","syns":["power", "force", "strength"]},
  "environment":{"pos":"noun","def":"The natural world around us.","ex":"We must protect the environment from pollution.","syns":["nature", "surroundings", "ecosystem"]},
  "equal":{"pos":"adjective","def":"The same in amount, value, or quality.","ex":"Everyone deserves equal treatment.","syns":["same", "identical", "even"]},
  "equation":{"pos":"noun","def":"A mathematical statement showing two equal expressions.","ex":"2 + 3 = 5 is a simple equation.","syns":["formula", "expression", "calculation"]},
  "equator":{"pos":"noun","def":"An imaginary line around the middle of the Earth.","ex":"Countries near the equator have hot climates.","syns":["midline", "center", "latitude"]},
  "erosion":{"pos":"noun","def":"The wearing away of land by water, wind, or ice.","ex":"Erosion by the river carved a deep canyon.","syns":["wearing away", "weathering", "degradation"]},
  "estimate":{"pos":"verb","def":"To make an approximate calculation.","ex":"Estimate the answer before doing the exact calculation.","syns":["approximate", "guess", "calculate roughly"]},
  "evaluate":{"pos":"verb","def":"To judge the value or quality of something.","ex":"Evaluate the sources before using them in your essay.","syns":["assess", "judge", "measure"]},
  "evaporation":{"pos":"noun","def":"When liquid turns into vapor or gas.","ex":"Evaporation turns puddles into water vapor.","syns":["vaporization", "drying", "conversion"]},
  "evidence":{"pos":"noun","def":"Facts or information that show something is true.","ex":"The scientist gathered evidence to support her theory.","syns":["proof", "clue", "sign"]},
  "evolution":{"pos":"noun","def":"The gradual change in species over many generations.","ex":"Darwin described the theory of evolution.","syns":["development", "change", "adaptation"]},
  "exponent":{"pos":"noun","def":"A number showing how many times a base is multiplied by itself.","ex":"In 2³, the exponent is 3, meaning 2×2×2=8.","syns":["power", "index", "superscript"]},
  "export":{"pos":"verb","def":"To send goods to another country for sale.","ex":"India exports tea to many countries.","syns":["sell abroad", "ship", "trade"]},
  "extinct":{"pos":"adjective","def":"No longer existing as a species.","ex":"The dodo bird is extinct because of human activity.","syns":["died out", "gone", "vanished"]},
  "factor":{"pos":"noun","def":"A number that divides exactly into another; also a cause.","ex":"The factors of 12 are 1, 2, 3, 4, 6, and 12.","syns":["divisor", "element", "component"]},
  "famine":{"pos":"noun","def":"An extreme shortage of food in a region.","ex":"The famine caused great suffering for millions.","syns":["starvation", "food shortage", "hunger"]},
  "feature":{"pos":"noun","def":"A noticeable part or quality of something.","ex":"The best feature of this phone is the camera.","syns":["quality", "characteristic", "trait"]},
  "fertile":{"pos":"adjective","def":"Able to produce abundant crops or support plant growth.","ex":"The fertile soil near the river grew tall crops.","syns":["productive", "rich", "abundant"]},
  "fiction":{"pos":"noun","def":"Literature that describes imaginary events and people.","ex":"Harry Potter is a work of fiction.","syns":["story", "novel", "fantasy"]},
  "flexible":{"pos":"adjective","def":"Able to change or bend easily.","ex":"Gymnasts must be flexible to do their moves.","syns":["adaptable", "adjustable", "pliable"]},
  "flood":{"pos":"noun","def":"An overflow of water onto normally dry land.","ex":"The flood destroyed many houses near the river.","syns":["inundation", "overflow", "deluge"]},
  "focus":{"pos":"verb","def":"To pay close attention to one thing.","ex":"Focus on your homework and avoid distractions.","syns":["concentrate", "direct", "center"]},
  "force":{"pos":"noun","def":"A push or pull that changes the motion of an object.","ex":"Gravity is a force that pulls things to the ground.","syns":["power", "energy", "strength"]},
  "fossil":{"pos":"noun","def":"The preserved remains of ancient living things in rock.","ex":"Scientists study fossils to learn about dinosaurs.","syns":["relic", "remains", "imprint"]},
  "fraction":{"pos":"noun","def":"A part of a whole shown as one number over another.","ex":"One half is written as the fraction 1/2.","syns":["part", "portion", "ratio"]},
  "freedom":{"pos":"noun","def":"The right to act, speak, or think as one wants.","ex":"Freedom of speech is an important right.","syns":["liberty", "independence", "autonomy"]},
  "frequency":{"pos":"noun","def":"How often something happens; also the number of waves per second.","ex":"The frequency of the sound wave was very high.","syns":["rate", "occurrence", "repetition"]},
  "friction":{"pos":"noun","def":"The resistance when two surfaces rub against each other.","ex":"Friction between tyres and road helps cars stop.","syns":["resistance", "drag", "abrasion"]},
  "function":{"pos":"noun","def":"The purpose or role of something; also a math relation.","ex":"The function of the heart is to pump blood.","syns":["purpose", "role", "use"]},
  "generate":{"pos":"verb","def":"To produce or create something.","ex":"Solar panels generate electricity from sunlight.","syns":["produce", "create", "make"]},
  "geography":{"pos":"noun","def":"The study of Earth's lands, features, and people.","ex":"Geography helps us understand different countries.","syns":["landscape", "terrain", "region"]},
  "geometry":{"pos":"noun","def":"The branch of math dealing with shapes, sizes, and positions.","ex":"In geometry we study triangles and circles.","syns":["shapes", "spatial math", "measurement"]},
  "glacier":{"pos":"noun","def":"A large slow-moving mass of ice.","ex":"The glacier carved a valley over thousands of years.","syns":["ice sheet", "ice mass", "snowfield"]},
  "global":{"pos":"adjective","def":"Relating to the whole world.","ex":"Climate change is a global problem.","syns":["worldwide", "international", "universal"]},
  "government":{"pos":"noun","def":"The group of people who rule a country or region.","ex":"The government makes laws to protect citizens.","syns":["authority", "administration", "leadership"]},
  "graph":{"pos":"noun","def":"A diagram showing the relationship between data.","ex":"The graph shows how temperature changes over a year.","syns":["chart", "diagram", "plot"]},
  "gravity":{"pos":"noun","def":"The force that pulls objects toward each other.","ex":"Gravity keeps planets orbiting the sun.","syns":["attraction", "pull", "force"]},
  "growth":{"pos":"noun","def":"The process of increasing in size or importance.","ex":"Plants need water and sunlight for growth.","syns":["development", "increase", "progress"]},
  "habitat":{"pos":"noun","def":"The natural home of an animal or plant.","ex":"The rainforest is the habitat of many species.","syns":["environment", "home", "ecosystem"]},
  "harmony":{"pos":"noun","def":"A pleasing agreement between things.","ex":"The choir sang in perfect harmony.","syns":["agreement", "balance", "unity"]},
  "hemisphere":{"pos":"noun","def":"Half of the Earth, divided by the equator or prime meridian.","ex":"Australia is in the southern hemisphere.","syns":["half", "region", "division"]},
  "herbivore":{"pos":"noun","def":"An animal that eats only plants.","ex":"Cows and rabbits are herbivores.","syns":["plant-eater", "grazer", "forager"]},
  "heredity":{"pos":"noun","def":"The passing of traits from parents to children.","ex":"Eye color is determined by heredity.","syns":["genetics", "inheritance", "lineage"]},
  "hibernate":{"pos":"verb","def":"To sleep through winter to conserve energy.","ex":"Bears hibernate during the cold winter months.","syns":["sleep", "rest", "lie dormant"]},
  "hierarchy":{"pos":"noun","def":"A system where things are ranked in order of importance.","ex":"A pyramid shows a hierarchy of needs.","syns":["ranking", "order", "structure"]},
  "history":{"pos":"noun","def":"The study of events that happened in the past.","ex":"History teaches us about ancient civilizations.","syns":["past", "record", "chronicle"]},
  "humidity":{"pos":"noun","def":"The amount of water vapor in the air.","ex":"High humidity makes hot weather feel even hotter.","syns":["moisture", "dampness", "wetness"]},
  "hypothesis":{"pos":"noun","def":"A proposed explanation to be tested by experiment.","ex":"Her hypothesis was that plants grow faster with music.","syns":["theory", "guess", "proposition"]},
  "identify":{"pos":"verb","def":"To recognize or name something correctly.","ex":"Can you identify the capital city of France?","syns":["recognize", "name", "classify"]},
  "immigrate":{"pos":"verb","def":"To come to a new country to live there permanently.","ex":"Her family immigrated from India in 1990.","syns":["move in", "settle", "migrate"]},
  "immune":{"pos":"adjective","def":"Protected from a disease by the body's defenses.","ex":"Vaccines help make us immune to diseases.","syns":["protected", "resistant", "defended"]},
  "import":{"pos":"verb","def":"To bring goods in from another country.","ex":"The country imports oil from overseas.","syns":["bring in", "purchase abroad", "trade"]},
  "independence":{"pos":"noun","def":"Freedom from outside control.","ex":"India gained independence in 1947.","syns":["freedom", "self-rule", "autonomy"]},
  "infer":{"pos":"verb","def":"To reach a conclusion based on evidence.","ex":"We can infer the character is brave from her actions.","syns":["deduce", "conclude", "figure out"]},
  "inflation":{"pos":"noun","def":"The general increase in prices over time.","ex":"Inflation means the same amount of money buys less.","syns":["price rise", "cost increase", "economic change"]},
  "inherit":{"pos":"verb","def":"To receive genes, property, or traits from parents.","ex":"She inherited her mother's blue eyes.","syns":["receive", "gain", "acquire"]},
  "interact":{"pos":"verb","def":"To act in a way that affects others.","ex":"Predators and prey interact in an ecosystem.","syns":["engage", "communicate", "relate"]},
  "interpret":{"pos":"verb","def":"To explain the meaning of something.","ex":"Interpret the graph to find the highest value.","syns":["explain", "analyze", "understand"]},
  "invertebrate":{"pos":"noun","def":"An animal without a backbone.","ex":"Insects and worms are invertebrates.","syns":["spineless animal", "soft-bodied animal"]},
  "investigate":{"pos":"verb","def":"To carefully examine something to find the truth.","ex":"Detectives investigate crimes to find clues.","syns":["examine", "explore", "study"]},
  "irrigation":{"pos":"noun","def":"Supplying water to land for growing crops.","ex":"Farmers use irrigation to water fields in dry areas.","syns":["watering", "water supply", "drainage system"]},
  "journal":{"pos":"noun","def":"A diary or record of events and thoughts.","ex":"She wrote in her journal every evening.","syns":["diary", "log", "record"]},
  "journey":{"pos":"noun","def":"A long trip from one place to another.","ex":"The journey to the mountain took three days.","syns":["trip", "voyage", "travel"]},
  "justice":{"pos":"noun","def":"Fair treatment and behavior toward everyone.","ex":"Justice means making sure everyone is treated fairly.","syns":["fairness", "equality", "law"]},
  "kinetic":{"pos":"adjective","def":"Relating to motion and energy of movement.","ex":"A rolling ball has kinetic energy.","syns":["moving", "dynamic", "active"]},
  "knowledge":{"pos":"noun","def":"Facts and information gained through experience.","ex":"Reading books builds knowledge.","syns":["understanding", "learning", "wisdom"]},
  "landform":{"pos":"noun","def":"A natural feature of the Earth's surface.","ex":"Mountains, valleys, and plains are landforms.","syns":["terrain", "geographic feature", "topography"]},
  "latitude":{"pos":"noun","def":"The distance north or south of the equator in degrees.","ex":"Places at high latitudes are farther from the equator.","syns":["coordinate", "position", "parallel"]},
  "law":{"pos":"noun","def":"A rule made by a government that everyone must follow.","ex":"The law protects people's rights and property.","syns":["rule", "regulation", "statute"]},
  "legend":{"pos":"noun","def":"A traditional story; also the key on a map.","ex":"The map legend explains what each symbol means.","syns":["key", "guide", "story"]},
  "legislature":{"pos":"noun","def":"The group of elected people who make laws.","ex":"The legislature voted to approve the new budget.","syns":["parliament", "congress", "assembly"]},
  "longitude":{"pos":"noun","def":"The distance east or west of the prime meridian.","ex":"Longitude helps us find locations on a map.","syns":["coordinate", "position", "meridian"]},
  "loyalty":{"pos":"noun","def":"Being faithful to someone or something.","ex":"Loyalty to your friends means supporting them.","syns":["faithfulness", "devotion", "dedication"]},
  "magnetic":{"pos":"adjective","def":"Having the properties of a magnet; able to attract metal.","ex":"A magnetic compass needle always points north.","syns":["attracting", "charged", "polar"]},
  "mammal":{"pos":"noun","def":"A warm-blooded animal that feeds young with milk.","ex":"Dogs, whales, and humans are all mammals.","syns":["warm-blooded animal", "vertebrate"]},
  "mass":{"pos":"noun","def":"The amount of matter in an object.","ex":"Mass is measured in grams and kilograms.","syns":["weight", "matter", "substance"]},
  "matter":{"pos":"noun","def":"Anything that has mass and takes up space.","ex":"All solids, liquids, and gases are forms of matter.","syns":["substance", "material", "stuff"]},
  "mean":{"pos":"noun","def":"The average of a set of numbers.","ex":"The mean of 2, 4, and 6 is 4.","syns":["average", "midpoint", "center value"]},
  "median":{"pos":"noun","def":"The middle value in a sorted list of numbers.","ex":"In the list 1,3,5,7,9 the median is 5.","syns":["middle value", "midpoint", "center"]},
  "memoir":{"pos":"noun","def":"A written account of personal experiences.","ex":"She wrote a memoir about growing up in the village.","syns":["autobiography", "account", "narrative"]},
  "metabolism":{"pos":"noun","def":"The chemical processes in the body that sustain life.","ex":"Exercise can speed up your metabolism.","syns":["body processes", "energy use", "digestion"]},
  "migrate":{"pos":"verb","def":"To move from one place to another seasonally.","ex":"Birds migrate south during winter.","syns":["move", "travel", "relocate"]},
  "mineral":{"pos":"noun","def":"A natural substance found in rocks and soil.","ex":"Iron is a mineral our bodies need to stay healthy.","syns":["ore", "element", "resource"]},
  "mode":{"pos":"noun","def":"The value that appears most often in a data set.","ex":"In 1,2,2,3,4 the mode is 2 because it appears twice.","syns":["most common", "frequent value", "peak"]},
  "molecule":{"pos":"noun","def":"The smallest unit of a substance with all its properties.","ex":"A water molecule is made of two hydrogen and one oxygen atom.","syns":["particle", "unit", "compound"]},
  "momentum":{"pos":"noun","def":"The force of a moving object based on its mass and speed.","ex":"A heavy truck has more momentum than a bicycle.","syns":["force", "drive", "impetus"]},
  "monarchy":{"pos":"noun","def":"A system of government led by a king or queen.","ex":"The United Kingdom is a constitutional monarchy.","syns":["kingdom", "royal rule", "sovereign state"]},
  "multiplication":{"pos":"noun","def":"The mathematical operation of repeated addition.","ex":"6 × 4 = 24 is an example of multiplication.","syns":["times", "repeated addition", "scaling"]},
  "myth":{"pos":"noun","def":"A traditional story explaining natural or cultural events.","ex":"Greek myths tell stories about gods and heroes.","syns":["legend", "fable", "tale"]},
  "narrative":{"pos":"noun","def":"A spoken or written account of connected events.","ex":"The narrative follows a young boy's adventure.","syns":["story", "account", "tale"]},
  "natural resource":{"pos":"noun","def":"Materials from nature used by humans.","ex":"Water, wood, and coal are natural resources.","syns":["resource", "raw material", "asset"]},
  "negative":{"pos":"adjective","def":"Less than zero; also having a bad effect.","ex":"Negative numbers are found to the left of zero.","syns":["minus", "below zero", "unfavorable"]},
  "neutral":{"pos":"adjective","def":"Not supporting either side; also neither acid nor base.","ex":"Water is a neutral substance on the pH scale.","syns":["unbiased", "impartial", "balanced"]},
  "nonfiction":{"pos":"noun","def":"Writing based on real facts and events.","ex":"Biographies and history books are nonfiction.","syns":["factual writing", "real account", "true story"]},
  "nutrient":{"pos":"noun","def":"A substance that provides nourishment to the body.","ex":"Fruits and vegetables contain many important nutrients.","syns":["nourishment", "mineral", "vitamin"]},
  "observe":{"pos":"verb","def":"To watch carefully to learn something.","ex":"Observe how the caterpillar turns into a butterfly.","syns":["watch", "notice", "examine"]},
  "omnivore":{"pos":"noun","def":"An animal that eats both plants and animals.","ex":"Bears are omnivores that eat fish, berries, and insects.","syns":["plant and meat eater", "generalist feeder"]},
  "opinion":{"pos":"noun","def":"A personal view or belief not based on fact.","ex":"In my opinion, dogs are the best pets.","syns":["view", "belief", "thought"]},
  "orbit":{"pos":"verb","def":"To travel in a circular path around another object.","ex":"The Moon orbits the Earth every 28 days.","syns":["circle", "revolve", "rotate around"]},
  "organism":{"pos":"noun","def":"Any living thing such as an animal or plant.","ex":"Every organism has basic needs like food and water.","syns":["living thing", "creature", "life form"]},
  "oxidation":{"pos":"noun","def":"A chemical reaction where a substance combines with oxygen.","ex":"Rust is caused by the oxidation of iron.","syns":["rusting", "burning", "chemical reaction"]},
  "parallel":{"pos":"adjective","def":"Lines that are the same distance apart and never meet.","ex":"Railway tracks are parallel lines.","syns":["equidistant", "side by side", "matching"]},
  "parliament":{"pos":"noun","def":"The group of elected representatives who make a country's laws.","ex":"The parliament voted to increase the education budget.","syns":["congress", "legislature", "assembly"]},
  "percent":{"pos":"noun","def":"A ratio expressed as a fraction of 100.","ex":"50 percent means 50 out of every 100.","syns":["proportion", "ratio", "fraction of 100"]},
  "perimeter":{"pos":"noun","def":"The total distance around the outside of a shape.","ex":"Add all sides to find the perimeter of a rectangle.","syns":["boundary", "edge", "circumference"]},
  "photosynthesis":{"pos":"noun","def":"The process plants use to make food from sunlight.","ex":"Photosynthesis requires sunlight, water, and carbon dioxide.","syns":["food production", "plant energy process"]},
  "pivot":{"pos":"noun","def":"A central point on which something turns.","ex":"The door turns on a pivot called a hinge.","syns":["axis", "center", "fulcrum"]},
  "planet":{"pos":"noun","def":"A large body in space that orbits a star.","ex":"Earth is the third planet from the sun.","syns":["world", "globe", "celestial body"]},
  "pollution":{"pos":"noun","def":"Harmful substances released into the environment.","ex":"Air pollution from factories affects health.","syns":["contamination", "toxins", "waste"]},
  "polygon":{"pos":"noun","def":"A closed 2D shape with straight sides.","ex":"A hexagon is a polygon with six sides.","syns":["shape", "figure", "closed shape"]},
  "population":{"pos":"noun","def":"The total number of people or organisms in an area.","ex":"The population of India is over one billion.","syns":["inhabitants", "residents", "community"]},
  "positive":{"pos":"adjective","def":"Greater than zero; also having a good effect.","ex":"Positive numbers are to the right of zero on a number line.","syns":["plus", "above zero", "beneficial"]},
  "precipitation":{"pos":"noun","def":"Water that falls from clouds as rain, snow, or hail.","ex":"The city receives about 600mm of precipitation a year.","syns":["rainfall", "snowfall", "rain"]},
  "predator":{"pos":"noun","def":"An animal that hunts and eats other animals.","ex":"The eagle is a predator that hunts mice and rabbits.","syns":["hunter", "carnivore", "attacker"]},
  "predict":{"pos":"verb","def":"To say what you think will happen in the future.","ex":"Scientists predict the weather using data.","syns":["forecast", "expect", "foresee"]},
  "pressure":{"pos":"noun","def":"Force applied over an area.","ex":"Air pressure decreases at higher altitudes.","syns":["force", "weight", "stress"]},
  "prey":{"pos":"noun","def":"An animal hunted and eaten by another.","ex":"Mice are common prey for owls and hawks.","syns":["victim", "food source", "target"]},
  "prime number":{"pos":"noun","def":"A number divisible only by 1 and itself.","ex":"7 is a prime number because only 1 and 7 divide it.","syns":["indivisible number", "prime"]},
  "probability":{"pos":"noun","def":"The likelihood that something will happen.","ex":"The probability of flipping heads is one in two.","syns":["chance", "likelihood", "odds"]},
  "proportion":{"pos":"noun","def":"A part considered in relation to a whole.","ex":"A large proportion of students passed the test.","syns":["ratio", "share", "fraction"]},
  "protein":{"pos":"noun","def":"A nutrient that builds and repairs body tissues.","ex":"Eggs, meat, and beans are good sources of protein.","syns":["nutrient", "building block", "macronutrient"]},
  "province":{"pos":"noun","def":"A region or area within a country.","ex":"Ontario is the largest province in Canada by population.","syns":["region", "state", "district"]},
  "publish":{"pos":"verb","def":"To prepare and issue a book or article for the public.","ex":"She plans to publish her first novel next year.","syns":["release", "print", "issue"]},
  "radiation":{"pos":"noun","def":"Energy transmitted as waves or particles through space.","ex":"Sunscreen protects skin from harmful UV radiation.","syns":["energy waves", "emission", "rays"]},
  "ratio":{"pos":"noun","def":"A comparison of two quantities using division.","ex":"The ratio of boys to girls is 3 to 2.","syns":["proportion", "comparison", "fraction"]},
  "reaction":{"pos":"noun","def":"A response to an event; also a chemical change.","ex":"A chemical reaction produces new substances.","syns":["response", "effect", "change"]},
  "reflect":{"pos":"verb","def":"To throw back light or sound; to think deeply.","ex":"A mirror reflects light so you can see yourself.","syns":["bounce back", "mirror", "consider"]},
  "reform":{"pos":"noun","def":"A change made to improve a system or organization.","ex":"The school introduced reforms to improve attendance.","syns":["change", "improvement", "revision"]},
  "regenerate":{"pos":"verb","def":"To grow again after damage.","ex":"Some lizards can regenerate their tail if it is lost.","syns":["regrow", "recover", "renew"]},
  "religion":{"pos":"noun","def":"A system of beliefs and practices about a higher power.","ex":"People practice religion in many different ways around the world.","syns":["faith", "belief", "spirituality"]},
  "renewable":{"pos":"adjective","def":"Can be replenished naturally and will not run out.","ex":"Wind and solar are renewable sources of energy.","syns":["sustainable", "inexhaustible", "replenishable"]},
  "represent":{"pos":"verb","def":"To act or speak on behalf of others.","ex":"The class president represents all students.","syns":["stand for", "symbolize", "speak for"]},
  "republic":{"pos":"noun","def":"A country governed by elected representatives.","ex":"India is the world's largest republic.","syns":["democracy", "state", "nation"]},
  "research":{"pos":"noun","def":"Careful study to find new information.","ex":"Good research involves reading many sources.","syns":["investigation", "study", "inquiry"]},
  "revolution":{"pos":"noun","def":"A complete change in government; also one full orbit.","ex":"The French Revolution changed the course of history.","syns":["uprising", "change", "overthrow"]},
  "rights":{"pos":"noun","def":"Things that people are allowed by law or nature.","ex":"Everyone has the right to education.","syns":["freedom", "entitlement", "privilege"]},
  "satellite":{"pos":"noun","def":"An object that orbits a planet; also a man-made device in space.","ex":"The satellite sends signals for GPS navigation.","syns":["moon", "orbital device", "spacecraft"]},
  "scale":{"pos":"noun","def":"A ratio showing size on a map; also a measuring device.","ex":"The map scale shows that 1cm equals 10km.","syns":["ratio", "proportion", "measurement"]},
  "sediment":{"pos":"noun","def":"Particles of rock or soil deposited by water or wind.","ex":"Sediment at the river bottom becomes sedimentary rock.","syns":["silt", "deposit", "particles"]},
  "segregation":{"pos":"noun","def":"The forced separation of people based on race or group.","ex":"Segregation in schools was declared illegal in 1954.","syns":["separation", "division", "discrimination"]},
  "sequence":{"pos":"noun","def":"A set of things arranged in a specific order.","ex":"Follow the sequence of steps to complete the experiment.","syns":["order", "series", "progression"]},
  "similar":{"pos":"adjective","def":"Almost the same but not exactly.","ex":"A square and a rectangle have similar shapes.","syns":["alike", "comparable", "related"]},
  "simulate":{"pos":"verb","def":"To imitate the conditions of a real situation.","ex":"Scientists simulate earthquakes to study their effects.","syns":["imitate", "model", "recreate"]},
  "slavery":{"pos":"noun","def":"The practice of owning people as property.","ex":"Slavery was abolished in the United States in 1865.","syns":["bondage", "servitude", "captivity"]},
  "solar system":{"pos":"noun","def":"The sun and all the objects that orbit around it.","ex":"Our solar system has eight planets.","syns":["planetary system", "universe", "cosmos"]},
  "solution":{"pos":"noun","def":"An answer to a problem; also a mixture of substances.","ex":"Saltwater is a solution of salt dissolved in water.","syns":["answer", "resolution", "mixture"]},
  "species":{"pos":"noun","def":"A group of living things that can breed together.","ex":"There are over 8 million species on Earth.","syns":["type", "kind", "group"]},
  "sphere":{"pos":"noun","def":"A perfectly round three-dimensional shape.","ex":"A basketball is an example of a sphere.","syns":["ball", "globe", "round shape"]},
  "statistic":{"pos":"noun","def":"A fact expressed as a number.","ex":"Statistics show that reading improves school performance.","syns":["figure", "data", "number"]},
  "stimulus":{"pos":"noun","def":"Something that causes a reaction.","ex":"Bright light is a stimulus that causes pupils to shrink.","syns":["trigger", "signal", "cause"]},
  "subtraction":{"pos":"noun","def":"The mathematical operation of taking one number from another.","ex":"10 minus 4 equals 6 — that is subtraction.","syns":["taking away", "minus", "reduction"]},
  "suffix":{"pos":"noun","def":"A group of letters added at the end of a word.","ex":"Adding '-ful' as a suffix turns 'hope' into 'hopeful'.","syns":["ending", "word part", "extension"]},
  "summarize":{"pos":"verb","def":"To give a short statement of the main points.","ex":"Summarize the story in three sentences.","syns":["outline", "condense", "recap"]},
  "supply":{"pos":"noun","def":"The amount of something available for use.","ex":"The supply of clean water is limited in dry regions.","syns":["stock", "amount", "inventory"]},
  "survey":{"pos":"noun","def":"A study that gathers information by asking questions.","ex":"The class did a survey to find the most popular sport.","syns":["questionnaire", "study", "poll"]},
  "symbol":{"pos":"noun","def":"Something that represents something else.","ex":"The dove is a symbol of peace.","syns":["sign", "representation", "mark"]},
  "symmetry":{"pos":"noun","def":"An exact match of shape on both sides of a line.","ex":"A butterfly's wings show symmetry.","syns":["balance", "mirror image", "proportion"]},
  "synonym":{"pos":"noun","def":"A word that has the same or similar meaning to another.","ex":"Happy and joyful are synonyms.","syns":["equivalent", "like word", "similar word"]},
  "technology":{"pos":"noun","def":"Machines and tools created using science.","ex":"Technology has changed how we communicate.","syns":["innovation", "science", "tools"]},
  "tectonic":{"pos":"adjective","def":"Relating to large-scale movement of Earth's crust.","ex":"Earthquakes are caused by tectonic plate movement.","syns":["geological", "crustal", "structural"]},
  "temperature":{"pos":"noun","def":"The degree of heat or cold measured in a substance.","ex":"The temperature outside is 30 degrees Celsius.","syns":["heat level", "warmth", "degree"]},
  "territory":{"pos":"noun","def":"An area of land under the control of a ruler or state.","ex":"The eagle defended its territory from other birds.","syns":["region", "zone", "land"]},
  "texture":{"pos":"noun","def":"The feel or appearance of a surface.","ex":"The texture of sandpaper is rough and scratchy.","syns":["feel", "surface", "consistency"]},
  "theory":{"pos":"noun","def":"A set of ideas to explain something.","ex":"Darwin's theory of evolution changed science.","syns":["idea", "hypothesis", "explanation"]},
  "tide":{"pos":"noun","def":"The rise and fall of sea levels caused by the moon.","ex":"High tide brings water up the beach twice a day.","syns":["wave", "flow", "swell"]},
  "timeline":{"pos":"noun","def":"A chart showing events in chronological order.","ex":"Create a timeline of important historical events.","syns":["schedule", "chronology", "sequence"]},
  "tissue":{"pos":"noun","def":"A group of similar cells that work together.","ex":"Muscle tissue contracts to move the body.","syns":["cells", "material", "layer"]},
  "topography":{"pos":"noun","def":"The physical features and shape of a land surface.","ex":"The topography of the Himalayas includes the world's highest peaks.","syns":["terrain", "landscape", "geography"]},
  "tradition":{"pos":"noun","def":"A custom passed down through generations.","ex":"Celebrating Diwali is a tradition in many families.","syns":["custom", "practice", "ritual"]},
  "transform":{"pos":"verb","def":"To change completely in form or character.","ex":"The caterpillar transforms into a butterfly.","syns":["change", "convert", "alter"]},
  "translation":{"pos":"noun","def":"Expressing words in a different language; also moving a shape.","ex":"The translation of the Spanish word 'libro' is 'book'.","syns":["interpretation", "conversion", "rendering"]},
  "transparent":{"pos":"adjective","def":"Allowing light to pass through; easy to see through.","ex":"Glass is transparent so you can see through windows.","syns":["clear", "see-through", "translucent"]},
  "treaty":{"pos":"noun","def":"A formal agreement between two or more countries.","ex":"The peace treaty ended the long war.","syns":["agreement", "accord", "pact"]},
  "triangle":{"pos":"noun","def":"A shape with three sides and three angles.","ex":"A triangle has angles that add up to 180 degrees.","syns":["three-sided shape", "polygon", "trigon"]},
  "tributary":{"pos":"noun","def":"A river or stream that flows into a larger river.","ex":"The Missouri River is a tributary of the Mississippi.","syns":["branch", "stream", "feeder"]},
  "tsunami":{"pos":"noun","def":"A huge ocean wave caused by an earthquake or eruption.","ex":"The tsunami flooded coastal villages within minutes.","syns":["tidal wave", "sea wave", "surge"]},
  "unique":{"pos":"adjective","def":"Being the only one of its kind.","ex":"Every fingerprint is unique.","syns":["special", "distinctive", "one-of-a-kind"]},
  "universe":{"pos":"noun","def":"All of space and everything in it.","ex":"The universe contains billions of galaxies.","syns":["cosmos", "space", "existence"]},
  "urban":{"pos":"adjective","def":"Relating to a city or town.","ex":"Urban areas have more traffic and buildings.","syns":["city", "metropolitan", "town"]},
  "variable":{"pos":"noun","def":"A quantity that can change; also a letter in an equation.","ex":"In 3x + 2, x is the variable.","syns":["unknown", "factor", "quantity"]},
  "velocity":{"pos":"noun","def":"The speed of something in a specific direction.","ex":"The car traveled at a velocity of 60 km/h north.","syns":["speed", "pace", "rate"]},
  "vertebrate":{"pos":"noun","def":"An animal with a backbone.","ex":"Humans, fish, and birds are all vertebrates.","syns":["spined animal", "backboned creature"]},
  "vibration":{"pos":"noun","def":"A rapid back-and-forth movement.","ex":"Sound travels as vibrations through the air.","syns":["oscillation", "trembling", "wave"]},
  "vocabulary":{"pos":"noun","def":"All the words used by a person or in a language.","ex":"Reading books helps expand your vocabulary.","syns":["words", "lexicon", "language"]},
  "volume":{"pos":"noun","def":"The amount of space an object takes up; also loudness.","ex":"The volume of a cube is length × width × height.","syns":["capacity", "space", "size"]},
  "volunteer":{"pos":"verb","def":"To offer to do something without being paid.","ex":"She decided to volunteer at the school library.","syns":["offer", "help", "contribute"]},
  "vote":{"pos":"verb","def":"To express a choice in an election.","ex":"Citizens vote to choose their leaders.","syns":["elect", "choose", "ballot"]},
  "weathering":{"pos":"noun","def":"The breaking down of rocks by natural forces.","ex":"Weathering by wind slowly wears away mountain rocks.","syns":["erosion", "breakdown", "decay"]},
  "welfare":{"pos":"noun","def":"The health, happiness, and wellbeing of a person.","ex":"The government provides welfare to support citizens in need.","syns":["wellbeing", "health", "support"]},
  "wisdom":{"pos":"noun","def":"The ability to make good judgments based on experience.","ex":"Wisdom comes from both learning and experience.","syns":["knowledge", "insight", "understanding"]},
  "wonder":{"pos":"verb","def":"To think about something with curiosity.","ex":"I wonder how birds know where to fly in winter.","syns":["think", "question", "ponder"]}
};

/* ═══════════════════════════════════════════════════════════
   DICTIONARY ENGINE — 100,000+ WORD COVERAGE
   ═══════════════════════════════════════════════════════════
   Strategy (in order):
   1. IndexedDB cache  — instant, works offline after first use
   2. dictionaryapi.dev — 70,000 words (Oxford/Wiktionary)
   3. Datamuse API     — 100,000+ words + synonyms/related
   4. Merriam-Webster  — open as new tab (470,000 words)
   5. Local bundle     — 322 key educational words (always works)
   6. Google fallback  — if nothing else works

   Every successful lookup is cached in IndexedDB so the
   next lookup of the same word is instant and offline.
═══════════════════════════════════════════════════════════ */

// ── IndexedDB Cache ──
const DB_NAME    = 'LearnBuddyDict';
const DB_VERSION = 1;
const DB_STORE   = 'words';

function openDictDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { resolve(null); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'word' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = () => resolve(null); // fail gracefully
  });
}

async function getCachedWord(word) {
  try {
    const db = await openDictDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx   = db.transaction(DB_STORE, 'readonly');
      const req  = tx.objectStore(DB_STORE).get(word.toLowerCase());
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}

async function cacheWord(word, entry) {
  try {
    const db = await openDictDB();
    if (!db) return;
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put({ word: word.toLowerCase(), ...entry, cachedAt: Date.now() });
  } catch { /* fail silently */ }
}

async function getCacheSize() {
  try {
    const db = await openDictDB();
    if (!db) return 0;
    return new Promise(resolve => {
      const tx  = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => resolve(0);
    });
  } catch { return 0; }
}

// ── Main lookup function ──
async function lookupDictionary(word) {
  if (!word || !word.trim()) return;
  word = word.trim().split(/\s+/)[0]; // single word

  switchTab('dict');
  document.getElementById('q-field').value = word;
  selText = word;

  const loading = document.getElementById('dict-loading');
  const results = document.getElementById('dict-results');
  loading.style.display = 'flex';
  results.innerHTML = '';
  results.style.display = 'none';

  // ── Step 1: IndexedDB cache ──
  const cached = await getCachedWord(word);
  if (cached) {
    loading.style.display = 'none';
    results.style.display = 'block';
    renderDictResult(cached, results, word, '⚡ From cache');
    return;
  }

  // ── Step 2: Try dictionaryapi.dev (70k+ words) ──
  try {
    const ctrl = new AbortController();
    const t1   = setTimeout(() => ctrl.abort(), 5000);
    const res  = await fetch(
      'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word),
      { signal: ctrl.signal }
    );
    clearTimeout(t1);

    if (res.ok) {
      const data = await res.json();
      const entry = parseDictAPIResponse(data, word);
      await cacheWord(word, entry);
      loading.style.display = 'none';
      results.style.display = 'block';
      renderDictResult(entry, results, word, 'dictionaryapi.dev');
      return;
    }
    // 404 = word not in this API, continue to next
  } catch { /* timeout/network — continue */ }

  // ── Step 3: Try Datamuse API (100k+ words, definitions + synonyms) ──
  try {
    const ctrl2 = new AbortController();
    const t2    = setTimeout(() => ctrl2.abort(), 5000);

    // Get definition
    const [defRes, synRes] = await Promise.allSettled([
      fetch('https://api.datamuse.com/words?sp=' + encodeURIComponent(word) + '&md=d&max=1', { signal: ctrl2.signal }),
      fetch('https://api.datamuse.com/words?rel_syn=' + encodeURIComponent(word) + '&max=8', { signal: ctrl2.signal })
    ]);
    clearTimeout(t2);

    let definitions = [];
    let synonyms    = [];

    if (defRes.status === 'fulfilled' && defRes.value.ok) {
      const defData = await defRes.value.json();
      if (defData.length && defData[0].defs) {
        definitions = defData[0].defs;
      }
    }
    if (synRes.status === 'fulfilled' && synRes.value.ok) {
      const synData = await synRes.value.json();
      synonyms = synData.map(w => w.word).slice(0, 8);
    }

    if (definitions.length > 0) {
      const entry = parseDatamuseResponse(word, definitions, synonyms);
      await cacheWord(word, entry);
      loading.style.display = 'none';
      results.style.display = 'block';
      renderDictResult(entry, results, word, 'Datamuse');
      return;
    }
  } catch { /* continue */ }

  // ── Step 4: Try Wiktionary API ──
  try {
    const ctrl3 = new AbortController();
    const t3    = setTimeout(() => ctrl3.abort(), 5000);
    const wikiRes = await fetch(
      'https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(word),
      { signal: ctrl3.signal }
    );
    clearTimeout(t3);

    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      const entry = parseWiktionaryResponse(wikiData, word);
      if (entry.meanings && entry.meanings.length) {
        await cacheWord(word, entry);
        loading.style.display = 'none';
        results.style.display = 'block';
        renderDictResult(entry, results, word, 'Wiktionary');
        return;
      }
    }
  } catch { /* continue */ }

  // ── Step 5: Local bundle (322 common words) ──
  const localEntry = LOCAL_DICT[word.toLowerCase()];
  if (localEntry) {
    loading.style.display = 'none';
    results.style.display = 'block';
    renderDictResult({
      word,
      phonetic: '',
      audioUrl: '',
      meanings: [{
        pos: localEntry.pos,
        defs: [{ def: localEntry.def, example: localEntry.ex }],
        synonyms: localEntry.syns || []
      }],
      source: 'Local bundle'
    }, results, word, '📚 Local bundle');
    return;
  }

  // ── Step 6: Nothing found ──
  loading.style.display = 'none';
  results.style.display = 'block';
  results.innerHTML = buildNotFoundHTML(word);
}

// ── Parse dictionaryapi.dev response ──
function parseDictAPIResponse(data, word) {
  const meanings = [];
  let phonetic = '';
  let audioUrl = '';

  // Find phonetic + audio
  for (const entry of data) {
    if (entry.phonetics) {
      for (const ph of entry.phonetics) {
        if (!phonetic && ph.text) phonetic = ph.text;
        if (!audioUrl && ph.audio) {
          audioUrl = ph.audio.startsWith('//') ? 'https:' + ph.audio : ph.audio;
        }
      }
    }
    if (entry.meanings) {
      for (const m of entry.meanings) {
        meanings.push({
          pos: m.partOfSpeech,
          defs: (m.definitions || []).slice(0, 3).map(d => ({ def: d.definition, example: d.example || '' })),
          synonyms: (m.synonyms || []).slice(0, 6)
        });
      }
    }
  }

  return { word, phonetic, audioUrl, meanings: meanings.slice(0, 4), source: 'dictionaryapi.dev' };
}

// ── Parse Datamuse response ──
function parseDatamuseResponse(word, defs, synonyms) {
  // Datamuse def format: "n	A definition here"  or "v	To do something"
  const posMap = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition' };
  const grouped = {};

  for (const def of defs) {
    const parts = def.split('\t');
    const pos   = parts.length > 1 ? (posMap[parts[0]] || parts[0]) : 'word';
    const text  = parts.length > 1 ? parts[1] : parts[0];
    if (!grouped[pos]) grouped[pos] = [];
    grouped[pos].push({ def: text, example: '' });
  }

  const meanings = Object.entries(grouped).slice(0, 4).map(([pos, defs]) => ({
    pos,
    defs: defs.slice(0, 3),
    synonyms: pos === Object.keys(grouped)[0] ? synonyms : []
  }));

  return { word, phonetic: '', audioUrl: '', meanings, source: 'Datamuse' };
}

// ── Parse Wiktionary API response ──
function parseWiktionaryResponse(data, word) {
  const meanings = [];
  const posMap = { Noun: 'noun', Verb: 'verb', Adjective: 'adjective', Adverb: 'adverb' };

  for (const [lang, entries] of Object.entries(data)) {
    if (lang !== 'en') continue;
    for (const entry of (entries || [])) {
      const pos = posMap[entry.partOfSpeech] || entry.partOfSpeech;
      const defs = (entry.definitions || []).slice(0, 3).map(d => ({
        def: (d.definition || '').replace(/<[^>]+>/g, ''), // strip HTML
        example: ((d.parsedExamples || [])[0]?.example || '').replace(/<[^>]+>/g, '')
      })).filter(d => d.def);
      if (defs.length) meanings.push({ pos, defs, synonyms: [] });
    }
  }

  return { word, phonetic: '', audioUrl: '', meanings: meanings.slice(0, 4), source: 'Wiktionary' };
}

// ── Render dictionary result ──
function renderDictResult(entry, container, word, sourceLabel) {
  const enc = encodeURIComponent(word);
  let html = '';

  // Entry header
  html += '<div class="dict-entry">';
  html += '<div class="dict-word">' + entry.word + '</div>';
  if (entry.phonetic) html += '<div class="dict-phonetic">' + entry.phonetic + '</div>';
  if (entry.audioUrl) {
    html += '<button class="dict-audio-btn" onclick="playDictAudio(\"' + entry.audioUrl + '\")">🔊 Hear pronunciation</button>';
  }

  // Meanings
  if (entry.meanings && entry.meanings.length) {
    entry.meanings.forEach(m => {
      html += '<div class="dict-pos">' + (m.pos || 'word') + '</div>';
      (m.defs || []).forEach((d, i) => {
        html += '<div class="dict-definition"><strong>' + (i + 1) + '.</strong> ' + d.def + '</div>';
        if (d.example) html += '<div class="dict-example">' + d.example + '</div>';
      });
      if (m.synonyms && m.synonyms.length) {
        html += '<div style="font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-l);margin:8px 0 5px;">Synonyms</div>'
          + '<div class="dict-synonyms">'
          + m.synonyms.map(s => '<span class="dict-syn-chip" onclick="lookupDictionary(&quot;' + s + '&quot;)">' + s + '</span>').join('')
          + '</div>';
      }
    });
  }

  html += '<div style="font-size:11px;color:var(--text-l);margin-top:10px;">Source: ' + sourceLabel + '</div>';
  html += '</div>';

  // External links
  html += '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;">'
    + '<a href="https://www.google.com/search?q=define+' + enc + '" target="_blank" class="dict-ext-btn dict-ext-g">🔍 Google</a>'
    + '<a href="https://www.merriam-webster.com/dictionary/' + enc + '" target="_blank" class="dict-ext-btn dict-ext-mw">📖 Merriam-Webster</a>'
    + '<a href="https://www.oxfordlearnersdictionaries.com/definition/english/' + enc + '" target="_blank" class="dict-ext-btn dict-ext-ox">🎓 Oxford</a>'
    + '<a href="https://en.wiktionary.org/wiki/' + enc + '" target="_blank" class="dict-ext-btn" style="border-color:#36c;">📘 Wiktionary</a>'
    + '</div>';

  container.innerHTML = html;
}

// ── Build not-found HTML ──
function buildNotFoundHTML(word) {
  const enc = encodeURIComponent(word);
  return '<div class="dict-not-found">'
    + '<div class="nf-icon">🔍</div>'
    + '<div class="nf-title">Word not found</div>'
    + '<div class="nf-sub">The word <strong>"' + word + '"</strong> was not found in any dictionary source.<br>It may be a proper noun, name, or spelling variant.</div>'
    + '<a href="https://www.google.com/search?q=define+' + enc + '" target="_blank" class="dict-google-btn">🔍 Search Google for "' + word + '"</a><br>'
    + '<a href="https://www.merriam-webster.com/dictionary/' + enc + '" target="_blank" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:var(--white);color:var(--text-m);border:2px solid var(--border);border-radius:var(--r-md);text-decoration:none;font-size:13px;font-weight:700;margin-top:8px;">📖 Try Merriam-Webster</a>'
    + '</div>';
}

// ── Show local entry (used by cache miss path) ──
function showLocalDictEntry(word, loading, results) {
  const entry = LOCAL_DICT[word.toLowerCase()];
  loading.style.display = 'none';
  results.style.display = 'block';
  if (!entry) { results.innerHTML = buildNotFoundHTML(word); return; }
  renderDictResult({
    word,
    phonetic: '',
    audioUrl: '',
    meanings: [{ pos: entry.pos, defs: [{ def: entry.def, example: entry.ex || '' }], synonyms: entry.syns || [] }],
    source: 'Local bundle'
  }, results, word, '📚 Local bundle');
}

// ── Play pronunciation audio ──
function playDictAudio(url) {
  try { new Audio(url).play(); }
  catch(e) { toast('⚠️ Could not play audio'); }
}

// ── Show cache statistics (for debug) ──
async function showDictCacheInfo() {
  const count = await getCacheSize();
  toast('📚 ' + count.toLocaleString() + ' words cached locally in your browser');
}

// ── TRANSLATE UI (Google-powered, no API) ──
let translateTargetLang = localStorage.getItem('lb_translang') || 'ta'; // restored or default Tamil

function showTranslateUI(text) {
  // Set the displayed text FIRST — before switchTab() runs (which reads tr-original)
  const orig = document.getElementById('tr-original');
  if (orig) orig.textContent = (text && text.trim()) ? text.trim() : 'Type or select text to translate';

  // Now switch to translate tab (safe — tr-original is already populated)
  switchTab('translate');

  // Build Google Translate URL with the real text
  if (text && text.trim()) updateTranslateLinks(text.trim());
}


// ── OPEN EXTERNAL LINKS ──
// These are called as fallbacks; the primary mechanism is href set directly on <a> tags
function openTranslate() {
  const raw = document.getElementById('tr-original')?.textContent || '';
  const text = (raw && raw !== 'Type or select text to translate') ? raw : selText;
  const enc  = encodeURIComponent(text || '');
  if (!enc) { toast('⚠️ Select or type text to translate first'); return; }
  const lang = translateTargetLang || 'ta';
  const url  = 'https://translate.google.com/?sl=auto&tl=' + lang + '&text=' + enc + '&op=translate';
  const btn  = document.getElementById('tr-open-btn');
  if (btn) btn.href = url;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function updateTranslateLinks(text) {
  const enc  = encodeURIComponent(text || '');
  const lang = translateTargetLang || 'ta';
  const gtUrl = enc ? 'https://translate.google.com/?sl=auto&tl=' + lang + '&text=' + enc + '&op=translate' : '#';
  const btn = document.getElementById('tr-open-btn');
  if (btn) btn.href = gtUrl;
}

function setTranslateLang(btn) {
  document.querySelectorAll('.tr-lang-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  translateTargetLang = btn.dataset.lang;
  try { localStorage.setItem('lb_translang', translateTargetLang); } catch {}

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
  const enc     = encodeURIComponent(t);
  const encKids = encodeURIComponent(t + ' for kids');

  const urls = {
    g: t ? 'https://www.google.com/search?q=' + enc : '#',
    w: t ? 'https://en.wikipedia.org/wiki/Special:Search?search=' + enc : '#',
    k: t ? 'https://www.khanacademy.org/search?page_search_query=' + enc : '#',
    y: t ? 'https://www.youtube.com/results?search_query=' + encKids : '#'
  };

  ['g','w','k','y'].forEach(id => {
    const el = document.getElementById('sl-' + id);
    if (!el) return;
    // Set href directly — anchor clicks are never popup-blocked by browsers
    el.href = urls[id];
    el.dataset.url = urls[id]; // keep dataset in sync for openSearchLink fallback
    // Visually dim cards when no word selected
    el.style.opacity = t ? '1' : '0.45';
    el.style.pointerEvents = t ? '' : 'none';
  });
}

// Fallback for any inline onclick="openSearchLink('g')" still in markup
function openSearchLink(id) {
  const el = document.getElementById('sl-' + id);
  const url = el && (el.href || el.dataset.url);
  if (url && url !== '#' && !url.endsWith('#')) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    toast('⚠️ Please select a word first');
  }
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
  ['empty-s','result-s','search-area','translate-area','dict-area','notebook-area'].forEach(id => {
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
        '<a class="ext-link g" href="https://translate.google.com/?sl=auto&tl=' + (translateTargetLang||'ta') + '&text=' + encodeURIComponent(word) + '&op=translate" target="_blank">🌐 Google Translate</a>' +
        '<a class="ext-link w" href="https://en.wiktionary.org/wiki/' + encodeURIComponent(word) + '" target="_blank">📖 Wiktionary</a>' +
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
  // Update both the in-panel counters and the standalone workspace counters
  ['nb-cnt','nb-cnt2'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = all.length; });
  ['nb-mastered','nb-mastered2'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = mastered; });
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
  if (correct) {
    practiceScore++;
    // Only mark as mastered, never un-master an already-mastered word
    const all = getWords();
    const idx = all.findIndex(e => e.word === practiceQueue[practiceIdx].word);
    if (idx >= 0 && !all[idx].mastered) { all[idx].mastered = true; setWords(all); }
  }
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
  // Force layout before loadMaxPage measures container
  void overlay.offsetWidth;
  renderMaxThumbs();
  loadMaxPage(curPage);
  switchMaxTab('search');

  // Refit canvas when container is resized (e.g. zoom level change)
  const wrap = document.getElementById('max-canvas-wrap');
  if (window.ResizeObserver) {
    if (maxResizeObs) maxResizeObs.disconnect();
    maxResizeObs = new ResizeObserver(() => {
      if (pages[curPage]) { drawMaxCanvas(); fitMaxCanvas(); }
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

  const canvas    = document.getElementById('max-canvas');
  const scaleWrap = document.getElementById('max-canvas-scale-wrap');
  const scrollWrap= document.getElementById('max-canvas-wrap');
  const img = new Image();

  img.onload = () => {
    // Set internal buffer to natural size (pixel-accurate hit testing)
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.style.display = 'block';

    // Draw image
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Double rAF: first frame updates display, second has real dimensions
    requestAnimationFrame(() => requestAnimationFrame(() => fitMaxCanvas()));

    initMaxCanvasEvents(canvas, img);
  };
  img.src = pages[i].dataUrl;
}

function fitMaxCanvas() {
  const canvas     = document.getElementById('max-canvas');
  const scaleWrap  = document.getElementById('max-canvas-scale-wrap');
  const scrollWrap = document.getElementById('max-canvas-wrap');
  if (!canvas || !scaleWrap || !scrollWrap) return;
  if (!canvas.width || !canvas.height) return;

  // Reset transform so we can measure clean dimensions
  scaleWrap.style.transform  = 'none';
  scaleWrap.style.marginLeft = '0';
  scaleWrap.style.marginTop  = '0';
  scaleWrap.style.width      = canvas.width  + 'px';
  scaleWrap.style.height     = canvas.height + 'px';

  // Force a layout flush so clientWidth/Height are accurate
  void scrollWrap.offsetWidth;

  const availW = scrollWrap.clientWidth  - 24;
  const availH = scrollWrap.clientHeight - 24;

  // If container not laid out yet, retry on next frame
  if (availW <= 0 || availH <= 0) {
    requestAnimationFrame(fitMaxCanvas);
    return;
  }

  const fitScale = Math.min(availW / canvas.width, availH / canvas.height);

  // Centre the scaled image inside the scroll container using margins
  const scaledW = canvas.width  * fitScale;
  const scaledH = canvas.height * fitScale;
  const offsetX = Math.max(0, Math.floor((availW - scaledW) / 2));
  const offsetY = Math.max(0, Math.floor((availH - scaledH) / 2));

  scaleWrap.style.transformOrigin = 'top left';
  scaleWrap.style.transform       = 'scale(' + fitScale + ')';
  scaleWrap.style.marginLeft      = offsetX + 'px';
  scaleWrap.style.marginTop       = offsetY + 'px';

  canvas._maxFitScale = fitScale;
  scrollWrap.scrollLeft = 0;
  scrollWrap.scrollTop  = 0;
}

function drawMaxCanvas(hoverIdx, selRect) {
  const canvas = document.getElementById('max-canvas');
  if (!canvas || !pages[curPage]) return;
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    maxWordBoxes.forEach((wb, idx) => {
      if (wb.selected) {
        ctx.fillStyle = 'rgba(79,110,247,0.28)'; ctx.strokeStyle = '#4f6ef7'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(wb.x-2, wb.y-1, wb.w+4, wb.h+2, 3); ctx.fill(); ctx.stroke();
      } else if (idx === hoverIdx) {
        ctx.fillStyle = 'rgba(245,158,11,0.2)'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(wb.x-2, wb.y-1, wb.w+4, wb.h+2, 3); ctx.fill(); ctx.stroke();
      }
    });
    if (selRect) {
      ctx.fillStyle = 'rgba(79,110,247,0.12)'; ctx.strokeStyle = '#4f6ef7'; ctx.lineWidth = 2;
      ctx.setLineDash([5,3]); ctx.strokeRect(selRect.x, selRect.y, selRect.w, selRect.h);
      ctx.fillRect(selRect.x, selRect.y, selRect.w, selRect.h); ctx.setLineDash([]);
    }
    // Re-fit after drawing (in case container changed)
    fitMaxCanvas();
  };
  img.src = pages[curPage].dataUrl;
}

let maxDragging = false, maxDragStart = {x:0,y:0};
function initMaxCanvasEvents(canvas) {
  if (canvas._maxEventsAttached) return;
  canvas._maxEventsAttached = true;
  let hoverIdx = -1;

  function toImgCoords(e) {
    // getBoundingClientRect already accounts for CSS transform:scale
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width  / r.width),
      y: (e.clientY - r.top)  * (canvas.height / r.height)
    };
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
  // Pre-populate active tab so links are ready immediately
  if (maxTab === 'search') updateMaxSearch(text);
}

function useMaxSelected() {
  const t = document.getElementById('max-sel-text').textContent.trim();
  if (!t) return;
  selText = t;
  document.getElementById('max-q-field').value = t;
  if (maxTab === 'search')    { updateMaxSearch(t); return; }
  if (maxTab === 'translate') {
    const enc  = encodeURIComponent(t);
    const lang = translateTargetLang || 'ta';
    window.open('https://translate.google.com/?sl=auto&tl=' + lang + '&text=' + enc + '&op=translate', '_blank', 'noopener,noreferrer');
    return;
  }
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
  if (qb) qb.style.display = '';
  const phs = {search:'Search for any word…', explain:'Word to explain…', translate:'Text to translate…', quiz:'Topic for quiz…'};
  const mq = document.getElementById('max-q-field');
  if (mq && phs[tab]) mq.placeholder = phs[tab];
  // Pre-populate search with current word when switching to search tab
  const cur = (mq && mq.value.trim()) || selText || '';
  if (cur && mq) mq.value = cur;
  if (tab === 'search') updateMaxSearch(cur);
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
// Restore last active tab
const _savedTab = localStorage.getItem('lb_tab') || 'search';

// Restore lesson pages from last session (before showing home)
restoreSessionFromLS();

// Set footer year
const _footerYear = document.getElementById('footer-year');
if (_footerYear) _footerYear.textContent = new Date().getFullYear();

// Show home dashboard on startup
if (typeof loadHomeStats === 'function') loadHomeStats();
switchTab(_savedTab);
renderNotebook();
updateSearchLinks('');

// Refit canvas on window/panel resize
if (window.ResizeObserver) {
  const _viewerObs = new ResizeObserver(() => {
    const canvas = document.getElementById('lesson-canvas');
    if (canvas && canvas.style.display !== 'none' && canvas.width) {
      fitCanvasToViewer();
      if (canvasZoom !== 1.0) applyCanvasZoom();
    }
  });
  const _scrollWrap = document.getElementById('canvas-scroll-wrap');
  if (_scrollWrap) _viewerObs.observe(_scrollWrap);
}
