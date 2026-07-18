#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'MESSAGE'
REFUSED: this legacy storefront-only deployment lane is retired.

It did not prove canonical source, verify artifact checksums, coordinate the
admin panel, or automatically roll back failed production health checks.

Use the owner-reviewed guarded transaction instead:

  deploy/deploy-asiandeligo-contabo.sh --commit <full-sha> --check-only
  deploy/deploy-asiandeligo-contabo.sh --commit <full-sha> --yes
MESSAGE

exit 64
