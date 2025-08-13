import fs from 'fs';
import path from 'path';

const type = process.argv[2] || 'minor';
const versionFile = path.resolve('js/version.js');
let content = fs.readFileSync(versionFile, 'utf8');
const match = content.match(/APP_VERSION\s*=\s*'([0-9]+)\.([0-9]+)'/);
if (!match) {
  throw new Error('Version not found');
}
let [major, minor] = match.slice(1).map(Number);
if (type === 'major') {
  major += 1;
  minor = 0;
} else {
  minor += 1;
}
const newVersion = `${major}.${minor}`;
content = content.replace(/APP_VERSION\s*=\s*'[^']+'/, `APP_VERSION = '${newVersion}'`);
fs.writeFileSync(versionFile, content);
console.log(`Version bumped to ${newVersion}`);
