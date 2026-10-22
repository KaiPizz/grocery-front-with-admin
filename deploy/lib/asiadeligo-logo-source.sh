#!/usr/bin/env bash
# Exact, owner-approved logo-only source profile; no production mutations.
LOGO_PATCH_SHA256=6ada134f44c2988f784cf031012bcb23d4ea20b7c610275076837fc612110a46
LOGO_BASE_COMMIT=db1459210dea11eff87ec8a334ca2d5271a73d8e

materialize_logo_source() {
  local root="$1" target="$2" commit="$3" patch="$4" names expected path
  git -C "$root" merge-base --is-ancestor "$LOGO_BASE_COMMIT" "$commit" || return 1
  git -C "$root" worktree add --detach "$target" "$LOGO_BASE_COMMIT" >/dev/null
  git -C "$root" show "$commit:deploy/patches/asiadeligo-logo-home.patch" > "$patch"
  [[ "$(sha256sum "$patch" | awk '{print $1}')" == "$LOGO_PATCH_SHA256" ]] || return 1
  git -C "$target" apply --index "$patch"
  names="$(git -C "$target" diff --cached --name-only)"
  expected=$'grocery-storefront/src/components/layout/Footer.tsx\ngrocery-storefront/src/components/layout/Header.tsx'
  [[ "$names" == "$expected" ]] || return 1
  for path in \
    grocery-storefront/public/brand/categories/drinks.webp \
    grocery-storefront/public/brand/categories/sauces-pastes.webp \
    grocery-storefront/tests/logo-home-navigation.spec.ts; do
    git -C "$root" show "$commit:$path" > "$target/$path"
    git -C "$target" add -- "$path"
  done
  [[ "$(sha256sum "$target/grocery-storefront/public/brand/categories/drinks.webp" | awk '{print $1}')" == 9f62ce65f3bb6ec01b46575d786ee67e99aad411c6c781bdd1da78c5839d7f3d ]] || return 1
  [[ "$(sha256sum "$target/grocery-storefront/public/brand/categories/sauces-pastes.webp" | awk '{print $1}')" == fed88032bd2e7f4b6f0266f41d80e31fa66b6e5785d230afe0ee8fe536189f89 ]] || return 1
  SOURCE_TREE_HASH="$(git -C "$target" write-tree)"
}
