const fs = require('fs');
const path = require('path');
const base = 'C:/Users/User/Desktop/AI Resume Builder/ai-resume-builder';
const join = (...p) => path.join(base, ...p);

// ── FILE 1: style.css ─────────────────────────────────────────
const css = /* ============================================================
   AI Resume Builder - Premium Stylesheet v2.0
   ============================================================ */

:root {
  --primary: #6C63FF;
  --primary-dark: #5A52E0;
  --primary-light: #EEEEFF;
  --secondary: #A855F7;
  --accent: #FF6584;
  --success: #10B981;
  --danger: #EF4444;
  --warning: #F59E0B;
  --dark: #0F172A;
  --dark-2: #1E293B;
  --muted: #64748B;
  --border: #E2E8F0;
  --bg: #F8FAFC;
  --bg-2: #F1F5F9;
  --white: #FFFFFF;
  --radius: 12px;
  --radius-lg: 20px;
  --shadow: 0 10px 40px rgba(108,99,255,.14);
  --shadow-sm: 0 2px 12px rgba(0,0,0,.06);
  --shadow-card: 0 4px 24px rgba(0,0,0,.08);
  --transition: all .25s cubic-bezier(.4,0,.2,1);
  --font: 'Inter','Plus Jakarta Sans',-apple-system,sans-serif;
  --gradient: linear-gradient(135deg,#6C63FF 0%,#A855F7 50%,#FF6584 100%);
  --gradient-soft: linear-gradient(135deg,#6C63FF 0%,#A855F7 100%);
}
TEST_MARKER;

console.log(css.slice(0, 100));
