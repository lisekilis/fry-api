import process from 'node:process';
import fs from 'node:fs';
import { parse } from 'jsonc-parser';

if (!process.env.API_TOKEN) {
	console.error('API_TOKEN environment variable is required');
	process.exit(1);
}
const wranglerContent = fs.readFileSync('./wrangler.jsonc', 'utf8');
const wrangler = parse(wranglerContent);
wrangler.vars.API_TOKEN = process.env.API_TOKEN;
fs.writeFileSync('./wrangler.json', JSON.stringify(wrangler, null, 2));
