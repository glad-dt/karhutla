'use strict';
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'public', 'bom-air-rimba.html');

function readHtml() {
  return fs.readFileSync(HTML_PATH, 'utf8');
}

// Isi blok <script> inline (tanpa src).
function extractScript(html) {
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Blok <script> inline tidak ditemukan');
  return m[1];
}

module.exports = { HTML_PATH, readHtml, extractScript };
