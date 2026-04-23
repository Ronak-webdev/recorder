# 🎙️ VoiceRecorder Pro

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.io/)

**VoiceRecorder Pro** is a high-performance, premium web application designed for audio dataset collection and management. It features a state-of-the-art recording interface with real-time visualization and a robust admin dashboard for data analysis.

---

## ✨ Key Features

### 🎧 Recording Session
- **Real-time Waveform**: Dynamic audio visualization using Canvas and Web Audio API.
- **Smart Sequence ID**: Automatic ID generation (e.g., `001`, `002`) with collision detection.
- **Pattern AI**: Intelligent ID incrementation to keep your dataset organized.
- **Mobile Optimized**: Custom bottom navigation for one-handed operation.

### 📊 Analytics Dashboard (Admin Only)
- **Speaker Insights**: Group recordings by speaker patterns.
- **Inline Audio Player**: Professional custom player with scrubber and volume control.
- **Bulk Operations**: One-click "Download All" as a ZIP file.
- **Responsive View**: Desktop tables transform into mobile cards automatically.
- **Secure Playback**: Uses Signed URLs for private storage access.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript.
- **Styling**: Tailwind CSS, Framer Motion (Animations).
- **Backend**: Supabase (PostgreSQL + Auth + Storage).
- **Audio Engine**: Web Audio API, WaveSurfer.js.
- **Routing**: React Router 7.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- A Supabase Project

### 2. Database & Storage Setup
Run the SQL scripts located in the `docs/` folder within your Supabase SQL Editor:
1. `docs/supabase_setup.sql`: Creates the `recordings` table and RLS policies.
2. `docs/add_display_id.sql`: Adds the smart ID column for better tracking.

**Storage**: Create a bucket named `audio-samples` in Supabase Storage and set it to **Public**.

### 3. Installation
```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Supabase URL and Anon Key
```

### 4. Run Development
```bash
npm run dev
```

---

## 🌐 Deployment (Netlify)

1. Connect this repo to Netlify.
2. Set **Build Command**: `npm run build`.
3. Set **Publish Directory**: `dist`.
4. **Environment Variables**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. **Auth Configuration**: Add your Netlify URL to Supabase > Auth > Site URL.

---

## 🔒 Security & Privacy

- **Row Level Security (RLS)**: Users can only upload recordings; they cannot delete or view others' data unless authorized.
- **Signed URLs**: Audio files are stored in private buckets and accessed via temporary secure links.
- **Admin Access**: The Dashboard is restricted to hardcoded administrator emails.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

Developed with ❤️ for high-quality data collection.
