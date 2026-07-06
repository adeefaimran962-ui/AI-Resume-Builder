const fs = require('fs');
const base = 'C:/Users/User/Desktop/AI Resume Builder/ai-resume-builder';
function w(rel,c){fs.writeFileSync(base+'/'+rel,c,'utf8');console.log('Wrote: '+rel);}

// ═══════════════════════════════════════════
// FILE 1: public/css/style.css
// ═══════════════════════════════════════════
var css = '';
css += '/* ============================================================\n';
css += '   AI Resume Builder - Premium Stylesheet v2.0\n';
css += '   Colors: primary #6C63FF, accent #FF6584, dark #0F172A\n';
css += '   ============================================================ */\n\n';
css += ':root {\n';
css += '  --primary: #6C63FF;\n';
css += '  --primary-dark: #5A52E0;\n';
css += '  --primary-light: #EEEEFF;\n';
css += '  --secondary: #A855F7;\n';
css += '  --accent: #FF6584;\n';
css += '  --success: #10B981;\n';
css += '  --danger: #EF4444;\n';
css += '  --warning: #F59E0B;\n';
css += '  --dark: #0F172A;\n';
css += '  --dark-2: #1E293B;\n';
css += '  --muted: #64748B;\n';
css += '  --border: #E2E8F0;\n';
css += '  --bg: #F8FAFC;\n';
css += '  --bg-2: #F1F5F9;\n';
css += '  --white: #FFFFFF;\n';
css += '  --radius: 12px;\n';
css += '  --radius-lg: 20px;\n';
css += '  --shadow: 0 10px 40px rgba(108,99,255,.14);\n';
css += '  --shadow-sm: 0 2px 12px rgba(0,0,0,.06);\n';
css += '  --shadow-card: 0 4px 24px rgba(0,0,0,.08);\n';
css += '  --transition: all .25s cubic-bezier(.4,0,.2,1);\n';
css += "  --font: 'Inter','Plus Jakarta Sans',-apple-system,sans-serif;\n";
css += '  --gradient: linear-gradient(135deg,#6C63FF 0%,#A855F7 50%,#FF6584 100%);\n';
css += '  --gradient-soft: linear-gradient(135deg,#6C63FF 0%,#A855F7 100%);\n';
css += '}\n\n';
