const body = {
  'title': 'My Resume',
  'education[0][institution]': 'Harvard',
  'education[0][degree]': 'BSc',
  'education[1][institution]': 'MIT',
  'education[1][degree]': 'MSc'
};

const extract = (prefix) => {
  const map = {};
  Object.keys(body).forEach(k => {
    const m = k.match(new RegExp(`^${prefix}\\[(\\d+)\\]\\[(.+)\\]$`));
    if (m) {
      const idx = parseInt(m[1], 10);
      if (!map[idx]) map[idx] = {};
      map[idx][m[2]] = body[k];
    }
  });
  return Object.keys(map)
    .sort((a, b) => a - b)
    .map(k => map[k])
    .filter(item => Object.values(item).some(v => v && String(v).trim() !== ''));
};

console.log(extract('education'));
