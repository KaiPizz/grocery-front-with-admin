import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const pageSource = readFileSync(
  path.join(process.cwd(), 'src', 'app', 'admin', 'security', 'page.tsx'),
  'utf8'
);

test('admin password form keeps a POST fallback and password-manager hints', () => {
  const forms = pageSource.match(/<form\b[\s\S]*?>/g) ?? [];
  assert.equal(forms.length, 1);
  assert.match(forms[0], /\bmethod="post"/i);
  assert.doesNotMatch(forms[0], /\bmethod="get"/i);
  assert.match(pageSource, /autoComplete="current-password"/);
  assert.match(pageSource, /autoComplete="new-password"/);
  assert.match(pageSource, /noValidate/);
  assert.match(pageSource, /aria-busy=\{submitting\}/);
});

test('password change sends credentials only in a JSON POST body', () => {
  assert.match(pageSource, /fetch\('\/api\/auth\/password',[\s\S]*?method: 'POST'/);
  assert.match(pageSource, /JSON\.stringify\(\{ currentPassword, newPassword, confirmation \}\)/);
  assert.doesNotMatch(pageSource, /URLSearchParams/);
});
