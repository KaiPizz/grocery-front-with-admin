#!/usr/bin/env bash
# Verify the real selected tree: checkout, admin and all other source stay live.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
source "$ROOT/deploy/lib/asiadeligo-logo-source.sh"
TEMP=$(mktemp -d /tmp/adg-logo-source-test.XXXXXX)
cleanup() {
  for target in "$TEMP/source" "$TEMP/rejected"; do
    git -C "$ROOT" worktree remove --force "$target" >/dev/null 2>&1 || true
  done
  rm -rf -- "$TEMP"
}
trap cleanup EXIT
COMMIT=$(git -C "$ROOT" rev-parse HEAD)
materialize_logo_source "$ROOT" "$TEMP/source" "$COMMIT" "$TEMP/logo.patch"
expected=$'grocery-storefront/public/brand/categories/drinks.webp\ngrocery-storefront/public/brand/categories/sauces-pastes.webp\ngrocery-storefront/src/components/layout/Footer.tsx\ngrocery-storefront/src/components/layout/Header.tsx\ngrocery-storefront/tests/logo-home-navigation.spec.ts'
actual=$(git -C "$TEMP/source" diff --name-only "$LOGO_BASE_COMMIT")
[[ "$actual" == "$expected" ]]
git -C "$TEMP/source" diff --quiet
[[ "$(git -C "$TEMP/source" write-tree)" == "$SOURCE_TREE_HASH" ]]
for component in Header Footer; do
  grep -q 'onNavigate=.*window.scrollTo' "$TEMP/source/grocery-storefront/src/components/layout/$component.tsx"
done
[[ "$(git -C "$TEMP/source" rev-parse HEAD)" == "$LOGO_BASE_COMMIT" ]]
LOGO_PATCH_SHA256=$(printf '0%.0s' {1..64})
if materialize_logo_source "$ROOT" "$TEMP/rejected" "$COMMIT" "$TEMP/rejected.patch"; then
  echo 'FAIL: changed patch hash accepted' >&2
  exit 1
fi
git -C "$TEMP/rejected" diff --exit-code "$LOGO_BASE_COMMIT"
echo 'PASS: exact five-path tree, live checkout/admin preserved, changed patch refused'
