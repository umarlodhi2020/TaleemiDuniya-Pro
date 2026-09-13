import assert from 'node:assert/strict';
import { normalizePhone, formatCnic, buildSchoolMenuText } from '../src/utils/waValidation.js';

assert.equal(normalizePhone('0300-1234567'), '03001234567');
assert.equal(normalizePhone('+92 300 1234567'), '923001234567');
assert.equal(formatCnic('4210112345678'), '42101-1234567-8');
assert.equal(formatCnic('42101-1234567-8'), '42101-1234567-8');
assert.match(buildSchoolMenuText('Lodhi School'), /Lodhi School/i);
assert.match(buildSchoolMenuText('Lodhi School'), /Fee/i);
console.log('waValidation tests passed');
