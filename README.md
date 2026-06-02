# 📚 LearnBuddy — Smart Lesson Explorer

An interactive educational web app for children aged 8–12.
Upload lesson images or PDFs, click words directly on the image,
and get AI-powered explanations, translations, and dictionary lookups.

## 🚀 Features

- 📄 **Upload images or PDFs** — each page shown as an interactive canvas
- 🖼️ **Paste screenshots** — Ctrl+V pastes directly
- 🔍 **Map Words** — Tesseract OCR maps every word on the image with a clickable bounding box
- 👆 **Click any word** on the image to instantly explain, translate, or look up
- 🖱️ **Drag to select** multiple words at once
- 🧠 **Explain** — Gemini AI gives a child-friendly explanation
- 🌍 **Translate** — Google Translate (free, no API key needed)
- 📚 **Dictionary** — Free Dictionary API + 230-word offline fallback
- 📒 **Notebook** — Save words, get definitions, practice flashcards
- ⛶ **Maximize view** — Full-screen mode with AI panel
- 🔊 **Read aloud** — Browser TTS reads extracted text
- ⬇️ **Save as PDF** — Export all pages

## 📁 File Structure

```
learnbuddy/
├── index.html      # Main HTML shell
├── styles.css      # All application styles
├── app.js          # Main application logic (~1000 lines)
├── dict.js         # Local dictionary data (230 words, offline fallback)
└── README.md       # This file
```

## ⚙️ Setup

### Run locally
No build step needed. Just open `index.html` in any modern browser.

```bash
# Option 1: Open directly
open index.html

# Option 2: Serve with Python
python3 -m http.server 8080
# Then open http://localhost:8080

# Option 3: VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

### Deploy to GitHub Pages
```bash
git init
git add .
git commit -m "Initial LearnBuddy deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/learnbuddy.git
git push -u origin main
```
Then in GitHub repo Settings → Pages → Source: `main` branch → Save.
Your app will be live at `https://YOUR_USERNAME.github.io/learnbuddy/`

### Deploy to Netlify (drag & drop)
1. Go to [netlify.com](https://netlify.com) → Log in
2. Drag the entire `learnbuddy/` folder onto the deploy area
3. Done — live in 30 seconds!

### Deploy to Vercel
```bash
npm i -g vercel
cd learnbuddy
vercel
```

## 🔑 API Keys

| Feature | API Key Needed | Cost |
|---------|---------------|------|
| Explain (Gemini) | ✅ Yes | Free tier: 1M tokens/day |
| Translate | ❌ No | Uses Google Translate links |
| Dictionary | ❌ No | Free API + local fallback |
| Search links | ❌ No | Opens Google/Wikipedia/etc |
| OCR (Map Words) | ❌ No | Runs in browser (Tesseract.js) |
| Read Aloud | ❌ No | Browser Web Speech API |

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com)

## 🌐 Browser Support

Works in all modern browsers: Chrome, Edge, Firefox, Safari.
Best experience in Chrome or Edge on Windows.

## 🔒 Privacy

All images and text stay in your browser.
Nothing is uploaded to any server except:
- Gemini API calls (only the text you select, not your images)
- Dictionary API calls (only the word you look up)

## 📝 License

MIT License — free to use, modify, and distribute.
