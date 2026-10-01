#!/usr/bin/env bash
# Builds the image from a clean checkout of HEAD (committed files only), starts it with
# docker compose on port 18080 and checks what the container actually serves.
set -euo pipefail

project=geofare-smoke
port=18080
base="http://127.0.0.1:${port}"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmp="$(mktemp -d)"

cleanup() {
  (cd "$tmp" && docker compose -p "$project" down --remove-orphans --rmi local >/dev/null 2>&1) || true
  rm -rf "$tmp"
}
trap cleanup EXIT

failures=0
pass() { echo "  ok   $1"; }
fail() { echo "  FAIL $1"; failures=$((failures + 1)); }
check() { # check "description" command...
  local what="$1"; shift
  if "$@" >/dev/null 2>&1; then pass "$what"; else fail "$what"; fi
}

echo "Building from a clean checkout of HEAD"
git -C "$repo" archive HEAD | tar -x -C "$tmp"
(
  cd "$tmp"
  GEOFARE_PORT=$port SITE_URL=https://smoke.example docker compose -p "$project" up -d --build --wait
)

echo "Checking $base"
headers_of() { curl -s -o /dev/null -D - "$@"; }
status_of() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

home_html="$(curl -s "$base/")"
[ "$(status_of "$base/")" = 200 ] && pass "/ returns 200" || fail "/ returns 200"
grep -q "Make good decisions" <<<"$home_html" && pass "/ contains the hero headline" || fail "/ contains the hero headline"
grep -q '<link rel="canonical" href="https://smoke.example/"' <<<"$home_html" && pass "SITE_URL reaches the canonical link" || fail "SITE_URL reaches the canonical link"
curl -s "$base/robots.txt" | grep -q "https://smoke.example/sitemap-index.xml" && pass "SITE_URL reaches robots.txt" || fail "SITE_URL reaches robots.txt"
curl -s "$base/sitemap-0.xml" | grep -q "https://smoke.example/" && pass "SITE_URL reaches the sitemap" || fail "SITE_URL reaches the sitemap"

[ "$(status_of "$base/healthz")" = 200 ] && [ "$(curl -s "$base/healthz")" = ok ] && pass "/healthz returns 200 ok" || fail "/healthz returns 200 ok"

[ "$(status_of "$base/nope")" = 404 ] && pass "/nope returns 404" || fail "/nope returns 404"
curl -s "$base/nope" | grep -q "Page not found" && pass "404 body is the custom page" || fail "404 body is the custom page"

# A directory-style URL must not redirect to an absolute URL with the internal port.
location="$(headers_of "$base/privacy/" | tr -d '\r' | grep -i '^location:' || true)"
[ -z "$location" ] && pass "/privacy/ does not redirect" || fail "/privacy/ redirects: $location"
[ "$(status_of "$base/privacy")" = 200 ] && pass "/privacy returns 200" || fail "/privacy returns 200"

headers_of -H 'Accept-Encoding: gzip' "$base/" | grep -qi '^content-encoding: gzip' && pass "/ is gzip-compressed" || fail "/ is gzip-compressed"

css_path="$(grep -o '/_astro/[^"]*\.css' <<<"$home_html" | head -1)"
[ -n "$css_path" ] && pass "found a stylesheet in the HTML ($css_path)" || fail "found a stylesheet in the HTML"
headers_of "$base$css_path" | grep -i '^cache-control:' | grep -q 'immutable' && pass "/_astro/ file is immutable" || fail "/_astro/ file is immutable"
headers_of "$base/" | grep -i '^cache-control:' | grep -q 'no-cache' && pass "HTML is no-cache" || fail "HTML is no-cache"
headers_of "$base/favicon.svg" | grep -i '^cache-control:' | grep -q 'max-age=86400' && pass "favicon is cached for one day" || fail "favicon is cached for one day"

security_headers=(
  "content-security-policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
  "x-content-type-options: nosniff"
  "x-frame-options: DENY"
  "referrer-policy: strict-origin-when-cross-origin"
  "permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()"
  "cross-origin-opener-policy: same-origin"
)
for target in "/" "$css_path" "/nope" "/healthz"; do
  got="$(headers_of "$base$target" | tr -d '\r' | tr '[:upper:]' '[:lower:]')"
  for header in "${security_headers[@]}"; do
    grep -qxF "$(tr '[:upper:]' '[:lower:]' <<<"$header")" <<<"$got" && pass "$target has ${header%%:*}" || fail "$target has ${header%%:*}"
  done
  grep -qi '^server: nginx/' <<<"$got" && fail "$target leaks the nginx version" || true
  grep -qi '^set-cookie:' <<<"$got" && fail "$target sets a cookie" || pass "$target sets no cookie"
done
headers_of "$base/" | grep -qi '^strict-transport-security' && fail "HSTS must not be sent by the container" || pass "no HSTS (the proxy owns TLS)"

container="$(cd "$tmp" && docker compose -p "$project" ps -q web)"
[ "$(docker inspect -f '{{.State.Health.Status}}' "$container")" = healthy ] && pass "health check is healthy" || fail "health check is healthy"
uid="$(docker exec "$container" id -u)"
[ "$uid" != 0 ] && pass "runs as non-root (uid $uid)" || fail "runs as non-root"
[ "$(docker inspect -f '{{.HostConfig.ReadonlyRootfs}}' "$container")" = true ] && pass "root filesystem is read-only" || fail "root filesystem is read-only"

size="$(docker image inspect geofare-website --format '{{.Size}}')"
echo "  info image size: $((size / 1024 / 1024)) MB"

if [ "$failures" -ne 0 ]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "All checks passed"
