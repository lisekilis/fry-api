import process from 'node:process';
import fs from 'node:fs';

const wrangler = JSON.parse(fs.readFileSync('./wrangler.json', 'utf8'));
wrangler.env.API_TOKEN = process.env.API_TOKEN;
fs.writeFileSync('./wrangler.json', JSON.stringify(wrangler, null, 2));
