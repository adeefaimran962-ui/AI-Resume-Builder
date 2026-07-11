/**
 * Verify all changes are in place
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying all changes...\n');

const checks = [];

// Check 1: resume-form.js exists
const resumeFormPath = path.join(__dirname, 'public', 'js', 'resume-form.js');
if (fs.existsSync(resumeFormPath)) {
  const content = fs.readFileSync(resumeFormPath, 'utf8');
  if (content.includes('window.addItem')) {
    checks.push({ name: 'resume-form.js', status: '✅', detail: 'File exists with addItem function' });
  } else {
    checks.push({ name: 'resume-form.js', status: '❌', detail: 'File exists but missing addItem' });
  }
} else {
  checks.push({ name: 'resume-form.js', status: '❌', detail: 'File does not exist' });
}

// Check 2: Dashboard has Quick Actions
const dashboardPath = path.join(__dirname, 'views', 'dashboard', 'index.ejs');
if (fs.existsSync(dashboardPath)) {
  const content = fs.readFileSync(dashboardPath, 'utf8');
  if (content.includes('Quick Actions')) {
    checks.push({ name: 'Dashboard Quick Actions', status: '✅', detail: 'Section present' });
  } else {
    checks.push({ name: 'Dashboard Quick Actions', status: '❌', detail: 'Section missing' });
  }
  
  if (content.includes('lucide')) {
    checks.push({ name: 'Dashboard Lucide Icons', status: '✅', detail: 'Icons integrated' });
  } else {
    checks.push({ name: 'Dashboard Lucide Icons', status: '❌', detail: 'Icons missing' });
  }
  
  if (content.includes('Cover Letter')) {
    checks.push({ name: 'Cover Letter Section', status: '✅', detail: 'Section present' });
  } else {
    checks.push({ name: 'Cover Letter Section', status: '❌', detail: 'Section missing' });
  }
} else {
  checks.push({ name: 'Dashboard', status: '❌', detail: 'File does not exist' });
}

// Check 3: form.ejs has script reference
const formPath = path.join(__dirname, 'views', 'resume', 'form.ejs');
if (fs.existsSync(formPath)) {
  const content = fs.readFileSync(formPath, 'utf8');
  if (content.includes('resume-form.js')) {
    checks.push({ name: 'Form.ejs script reference', status: '✅', detail: 'resume-form.js loaded' });
  } else {
    checks.push({ name: 'Form.ejs script reference', status: '❌', detail: 'resume-form.js not referenced' });
  }
} else {
  checks.push({ name: 'Form.ejs', status: '❌', detail: 'File does not exist' });
}

// Check 4: main.js has page detection
const mainJsPath = path.join(__dirname, 'public', 'js', 'main.js');
if (fs.existsSync(mainJsPath)) {
  const content = fs.readFileSync(mainJsPath, 'utf8');
  if (content.includes('isNewPage')) {
    checks.push({ name: 'main.js page detection', status: '✅', detail: 'Page detection logic present' });
  } else {
    checks.push({ name: 'main.js page detection', status: '❌', detail: 'Page detection missing' });
  }
} else {
  checks.push({ name: 'main.js', status: '❌', detail: 'File does not exist' });
}

// Check 5: closing.ejs has cache busting
const closingPath = path.join(__dirname, 'views', 'partials', 'closing.ejs');
if (fs.existsSync(closingPath)) {
  const content = fs.readFileSync(closingPath, 'utf8');
  if (content.includes('?v=')) {
    checks.push({ name: 'closing.ejs cache busting', status: '✅', detail: 'Version parameter present' });
  } else {
    checks.push({ name: 'closing.ejs cache busting', status: '⚠️', detail: 'No cache busting (optional)' });
  }
} else {
  checks.push({ name: 'closing.ejs', status: '❌', detail: 'File does not exist' });
}

// Check 6: test-buttons.html exists
const testPath = path.join(__dirname, 'public', 'test-buttons.html');
if (fs.existsSync(testPath)) {
  checks.push({ name: 'test-buttons.html', status: '✅', detail: 'Test page available' });
} else {
  checks.push({ name: 'test-buttons.html', status: '⚠️', detail: 'Test page missing (optional)' });
}

// Print results
console.log('═══════════════════════════════════════════════════════\n');
checks.forEach(check => {
  console.log(`${check.status} ${check.name}`);
  console.log(`   ${check.detail}\n`);
});

console.log('═══════════════════════════════════════════════════════\n');

// Summary
const passed = checks.filter(c => c.status === '✅').length;
const failed = checks.filter(c => c.status === '❌').length;
const warnings = checks.filter(c => c.status === '⚠️').length;

console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⚠️  Warnings: ${warnings}`);
console.log(`📊 Total: ${checks.length}\n`);

if (failed === 0) {
  console.log('🎉 All critical changes are in place!\n');
  console.log('Next steps:');
  console.log('1. Restart server: npm start');
  console.log('2. Clear browser cache: Ctrl+Shift+Delete');
  console.log('3. Hard refresh: Ctrl+F5');
  console.log('4. Test: http://localhost:3000/dashboard\n');
} else {
  console.log('❌ Some changes are missing. Check the details above.\n');
  process.exit(1);
}

