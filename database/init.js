import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rulesPath = path.join(__dirname, 'rules.json');
const schemaPath = path.join(__dirname, 'schema.sql');

console.log('--- Initializing Database & Rule Engine Verification ---');
if (fs.existsSync(rulesPath)) {
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  console.log(`✓ Rules database loaded successfully. Ver: ${rules.terakhir_diperbarui}`);
  console.log(`✓ Total perizinan categories: ${rules.kategori_izin ? rules.kategori_izin.length : 0}`);
} else {
  console.error('✗ rules.json not found!');
}

if (fs.existsSync(schemaPath)) {
  console.log('✓ SQLite schema file detected.');
} else {
  console.error('✗ schema.sql not found!');
}
console.log('Database initialization complete.');
