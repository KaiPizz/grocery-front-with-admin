import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CONFIG } from './defaults';
import { storefrontConfigSchema } from './validation';

test('preserves owner-configured opening hours during admin saves', () => {
  const config = structuredClone(DEFAULT_CONFIG);
  config.general.openingHours = [
    {
      label: 'Pon. – Sob.',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '7:00',
      closes: '19:00',
    },
    {
      label: 'Niedziela',
      days: ['Sunday'],
      opens: null,
      closes: null,
    },
  ];

  const parsed = storefrontConfigSchema.parse(config);

  assert.deepEqual(parsed.general.openingHours, config.general.openingHours);
});

test('keeps legacy configs valid when opening hours are absent', () => {
  const config = structuredClone(DEFAULT_CONFIG);
  delete config.general.openingHours;

  const parsed = storefrontConfigSchema.parse(config);

  assert.equal(parsed.general.openingHours, undefined);
});

test('rejects invalid opening-hour days, times, and half-closed entries', () => {
  const invalidDay = structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>;
  const invalidTime = structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>;
  const halfClosed = structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>;

  (invalidDay.general as Record<string, unknown>).openingHours = [{
    label: 'Weekdays',
    days: ['Funday'],
    opens: '07:00',
    closes: '19:00',
  }];
  (invalidTime.general as Record<string, unknown>).openingHours = [{
    label: 'Weekdays',
    days: ['Monday'],
    opens: '25:00',
    closes: '19:00',
  }];
  (halfClosed.general as Record<string, unknown>).openingHours = [{
    label: 'Sunday',
    days: ['Sunday'],
    opens: null,
    closes: '19:00',
  }];

  assert.equal(storefrontConfigSchema.safeParse(invalidDay).success, false);
  assert.equal(storefrontConfigSchema.safeParse(invalidTime).success, false);
  assert.equal(storefrontConfigSchema.safeParse(halfClosed).success, false);
});
