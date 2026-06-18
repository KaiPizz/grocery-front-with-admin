import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { auditKenmitoConfig } from '../src/lib/kenmito-config-audit';
import type { StorefrontConfig } from '../src/types/config';

interface KenmitoConfigFile {
  published?: StorefrontConfig;
  draft?: StorefrontConfig;
}

const configPath = resolve(process.cwd(), 'data/config-kenmito.json');
const configFile = JSON.parse(readFileSync(configPath, 'utf8')) as KenmitoConfigFile;

const issues = [
  { label: 'published', config: configFile.published },
  { label: 'draft', config: configFile.draft },
].flatMap(({ label, config }) => {
  if (!config) {
    return [{ id: `kenmito.${label}.missing`, message: `${label} config is missing.` }];
  }

  return auditKenmitoConfig(config).map((issue) => ({
    id: `${label}.${issue.id}`,
    message: issue.message,
  }));
});

if (issues.length > 0) {
  console.error('Kenmito config audit failed:');
  for (const issue of issues) {
    console.error(`- ${issue.id}: ${issue.message}`);
  }
  process.exitCode = 1;
} else {
  console.log('Kenmito config audit passed.');
}
