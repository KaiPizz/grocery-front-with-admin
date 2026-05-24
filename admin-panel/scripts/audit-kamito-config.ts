import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { auditKamitoConfig } from '../src/lib/kamito-config-audit';
import type { StorefrontConfig } from '../src/types/config';

interface KamitoConfigFile {
  published?: StorefrontConfig;
  draft?: StorefrontConfig;
}

const configPath = resolve(process.cwd(), 'data/config-kamito.json');
const configFile = JSON.parse(readFileSync(configPath, 'utf8')) as KamitoConfigFile;

const issues = [
  { label: 'published', config: configFile.published },
  { label: 'draft', config: configFile.draft },
].flatMap(({ label, config }) => {
  if (!config) {
    return [{ id: `kamito.${label}.missing`, message: `${label} config is missing.` }];
  }

  return auditKamitoConfig(config).map((issue) => ({
    id: `${label}.${issue.id}`,
    message: issue.message,
  }));
});

if (issues.length > 0) {
  console.error('Kamito config audit failed:');
  for (const issue of issues) {
    console.error(`- ${issue.id}: ${issue.message}`);
  }
  process.exitCode = 1;
} else {
  console.log('Kamito config audit passed.');
}
