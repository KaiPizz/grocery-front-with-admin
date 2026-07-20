import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const protectedFormFiles = [
  '../src/components/auth/AuthForm.tsx',
  '../src/components/auth/ForgotPasswordForm.tsx',
  '../src/components/auth/ResetPasswordForm.tsx',
  '../src/components/account/SecurityPanel.tsx',
  '../src/components/account/DeleteAccountPanel.tsx',
  '../src/components/account/ProfilePanel.tsx',
  '../src/components/account/AddressesPanel.tsx',
];

function openingFormTags(source) {
  return source.match(/<form\b[\s\S]*?>/g) ?? [];
}

test('customer credential and PII forms have explicit POST fallbacks', () => {
  for (const relativePath of protectedFormFiles) {
    const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    const forms = openingFormTags(source);

    assert.ok(forms.length > 0, `${relativePath} must keep at least one protected form`);
    for (const form of forms) {
      assert.match(form, /\bmethod=["']post["']/i, `${relativePath} must explicitly use POST`);
      assert.doesNotMatch(form, /\bmethod=["']get["']/i, `${relativePath} must not use GET`);
    }
  }
});
