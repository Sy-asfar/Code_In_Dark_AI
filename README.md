# Code in the Dark (AI-Powered Edition) 🚀

An automated, real-time web platform engineered for front-end speed-coding competitions, inspired by the global **"Code in the Dark"** hackathons. This platform eliminates manual grading bottlenecks by utilizing an integrated, multimodal **AI Judge Pipeline** to analyze, score, and critique participant frontend code against original design mockups in real time.

---

## 🛠️ Tech Stack & Architecture

* **Frontend:** React (Vite), Tailwind CSS, React Router DOM
* **Database & Core Real-Time State:** Firebase Firestore (Spark Plan sandbox tracking)
* **AI Core Integration Layer:** Google Gemini 2.5 Flash API (Serverless REST channel architecture)
* **Deployment Platform:** Vercel

---

## ✨ Features

* **Live Participant Workspace:** A timed code environment where frontend competitors build replica layouts purely from memory, completely blind without design previews or page refreshes.
* **Automated AI Judging Engine:** Uses direct, client-side browser streaming to feed raw HTML/CSS input and localized canvas-to-Base64 design snapshots directly into the Gemini API.
* **Dynamic Admin Control Dashboard:** Implements real-time Firestore `onSnapshot` streaming listeners to instantly update the scoreboard, project custom code inputs, and render automated critique summaries without page refreshes.

---

## 📦 System Architecture Workflow

1. **Match Initialization:** Admin deploys a live room containing a unique layout mockup URL.
2. **Execution Phase:** Participants compile raw HTML/CSS strings within a strict countdown loop.
3. **AI Pipeline Trigger:** On timeout or submission submit, the app scrapes the target design file, bypasses cross-origin CORS locks locally using an inline canvas conversion utility, and fires a POST request to Google's evaluation model.
4. **Scoreboard Sync:** The parsed JSON output payload (`{ score, feedback }`) is written back to the Firestore `submissions` collection, instantly rendering row details across the live Admin panel display screen.

---

## 🚀 Local Deployment Setup Instructions

### 1. Clone & Install Project Dependencies
```bash
git clone [https://github.com/YOUR_USERNAME/code-in-the-dark-ai.git](https://github.com/YOUR_USERNAME/code-in-the-dark-ai.git)
cd code-in-the-dark-ai
npm install
