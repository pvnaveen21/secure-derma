const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'public', 'env.js');

const config = {
  BASEURL_API: process.env.BASEURL_API || 'http://127.0.0.1:8000/api/admin'
};

const content = 'window.__SECURE_DERMA_ENV__ = ' + JSON.stringify(config, null, 2) + ';\n';

fs.writeFileSync(outputPath, content);
console.log('Generated ' + outputPath);
