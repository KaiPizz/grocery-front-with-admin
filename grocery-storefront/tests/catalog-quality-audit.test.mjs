import assert from 'node:assert/strict';
import test from 'node:test';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  findDietaryIngredientConflicts,
  getIssueSeverity,
  loadManualFindings,
} from '../scripts/catalog-quality-audit.mjs';

test('does not treat Polish riboflavin or ribonucleotide names as fish', () => {
  const ingredients = [
    'barwnik: ryboflawina (E101)',
    'wzmacniacz smaku: rybonukleotyd disodowy (E635)',
  ].join('; ');

  assert.deepEqual(findDietaryIngredientConflicts(ingredients), {
    animal: false,
    vegan: false,
  });
});

test('still detects real animal ingredients and vegan-only conflicts', () => {
  assert.deepEqual(
    findDietaryIngredientConflicts('bulion rybny, suszone krewetki'),
    { animal: true, vegan: true },
  );
  assert.deepEqual(
    findDietaryIngredientConflicts('mąka pszenna, miód, serwatka'),
    { animal: false, vegan: true },
  );
});

test('respects word boundaries while still matching an explicit ingredient word', () => {
  assert.deepEqual(
    findDietaryIngredientConflicts('honeybush, chicken-style branding without ingredient claim'),
    { animal: true, vegan: true },
  );
  assert.deepEqual(
    findDietaryIngredientConflicts('honeybush, tunaweza'),
    { animal: false, vegan: false },
  );
});

test('loads reviewed SKU findings and assigns launch-gate severities', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-manual-findings-'));
  const filePath = path.join(directory, 'findings.json');
  fs.writeFileSync(filePath, JSON.stringify({
    findings: [
      {
        sku: 'adg-001446',
        issue: 'verified_image_identity_mismatch',
        note: 'Image shows COCO-D while the catalog row describes AROY-D.',
      },
      {
        sku: 'ADG-001282',
        issue: 'possible_physical_duplicate',
      },
    ],
  }));

  assert.deepEqual(loadManualFindings(filePath), [
    {
      sku: 'ADG-001446',
      issue: 'verified_image_identity_mismatch',
      note: 'Image shows COCO-D while the catalog row describes AROY-D.',
    },
    {
      sku: 'ADG-001282',
      issue: 'possible_physical_duplicate',
      note: '',
    },
  ]);
  assert.equal(getIssueSeverity('verified_image_identity_mismatch'), 'blocker');
  assert.equal(getIssueSeverity('possible_physical_duplicate'), 'review');
});
