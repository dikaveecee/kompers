import { existsSync, mkdirSync, cpSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const src = path.join(root, 'contracts', 'managed', 'kompers');
const dest = path.join(root, 'web', 'public');

if (!existsSync(path.join(src, 'keys'))) {
  console.error('Missing compiled keys. Run npm run compile first.');
  process.exit(1);
}

mkdirSync(path.join(dest, 'keys'), { recursive: true });
mkdirSync(path.join(dest, 'zkir'), { recursive: true });
cpSync(path.join(src, 'keys'), path.join(dest, 'keys'), { recursive: true });
cpSync(path.join(src, 'zkir'), path.join(dest, 'zkir'), { recursive: true });
console.log('Copied ZK keys and zkir into web/public');
