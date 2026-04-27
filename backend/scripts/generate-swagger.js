const fs = require('fs');
const path = require('path');
const { buildOpenApiSpec } = require('../docs/openapi');

const outputDir = path.resolve(__dirname, '..', 'docs');
const outputFile = path.join(outputDir, 'openapi.json');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(buildOpenApiSpec(), null, 2)}\n`, 'utf8');

console.log(`Swagger spec generated at ${outputFile}`);
