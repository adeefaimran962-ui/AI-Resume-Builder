const ejs = require('ejs');
const fs  = require('fs');

const files = [
  'views/resume/templates/modern.ejs',
  'views/resume/templates/classic.ejs',
  'views/resume/templates/minimal.ejs',
];

files.forEach(file => {
  const src   = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');

  // Extract every individual EJS tag (greedy-safe single-line approach)
  const tagRe = /<%(-|=|#)?([\s\S]*?)%>/g;

  lines.forEach((line, lineNum) => {
    let m;
    const re = /<%(-|=|#)?(.*?)%>/g;
    while ((m = re.exec(line)) !== null) {
      const inner = m[2];
      // Skip blank, pure whitespace, or comment tags
      if (!inner || inner.trim() === '') continue;
      if (m[1] === '#') continue; // EJS comment

      try {
        // Wrap in function to check JS validity
        new Function(inner + ';');
      } catch (e) {
        console.log(`BAD TAG [${file}] line ${lineNum + 1}: ${JSON.stringify(m[0])} => ${e.message}`);
      }
    }
  });

  console.log('Scanned:', file);
});
