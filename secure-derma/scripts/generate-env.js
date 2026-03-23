const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'public', 'env.js');

const config = {
  BASEURL_API: process.env.BASEURL_API || '/api',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || ''
};

const content = 'window.__SECURE_DERMA_CONFIG__ = ' + JSON.stringify(config, null, 2) + ';\n';

fs.writeFileSync(outputPath, content);
console.log('Generated ' + outputPath);
