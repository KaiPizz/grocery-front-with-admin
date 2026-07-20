import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const loginPageSource = readFileSync(
  path.join(process.cwd(), 'src', 'app', 'login', 'page.tsx'),
  'utf8',
);

function openingFormTags(source: string): string[] {
  return source.match(/<form\b[\s\S]*?>/g) ?? [];
}

test('admin credential form has an explicit POST fallback', () => {
  const forms = openingFormTags(loginPageSource);

  assert.equal(forms.length, 1, 'admin login must keep exactly one credential form');
  assert.match(forms[0], /\bmethod=["']post["']/i);
  assert.doesNotMatch(forms[0], /\bmethod=["']get["']/i);
});
