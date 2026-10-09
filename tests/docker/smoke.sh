#!/usr/bin/env bash
# Builds the image from a clean checkout of HEAD (committed files only), starts it with
# docker compose on port 18080 and checks what the container actually serves.
set -euo pipefail

project=geofare-smoke
image=geofare-website-smoke   # its own tag: never touches the real geofare-website image
port="${SMOKE_PORT:-18080}"
base="http://127.0.0.1:${port}"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
tmp=""
started=0

cleanup() {
  # Only remove what this run created: its own project's container and network, its own image tag.
  if [ "$started" = 1 ]; then
    (cd "$tmp" && docker compose -p "$project" down --remove-orphans >/dev/null 2>&1) || true
    docker image rm "$image" >/dev/null 2>&1 || true
  fi
  [ -n "$tmp" ] && rm -rf "$tmp"
}
trap cleanup EXIT

# Refuse to adopt anything that is already there.
existing="$(docker ps -a -q --filter "label=com.docker.compose.project=$project" || true)"
if [ -n "$existing" ]; then
  echo "A container of compose project $project already exists. Remove it yourself first: docker compose -p $project down" >&2
  exit 2
fi
if docker image inspect "$image" >/dev/null 2>&1; then
  echo "An image named $image already exists. Remove it yourself first: docker image rm $image" >&2
  exit 2
fi

failures=0
pass() { echo "  ok   $1"; }
fail() { echo "  FAIL $1"; failures=$((failures + 1)); }

tmp="$(mktemp -d)"

echo "Building from a clean checkout of HEAD"
git -C "$repo" archive HEAD | tar -x -C "$tmp"
started=1
(
  cd "$tmp"
  GEOFARE_PORT=$port GEOFARE_IMAGE=$image SITE_URL=https://smoke.example docker compose -p "$project" up -d --build --wait
)

echo "Checking $base"
headers_of() { curl -s -o /dev/null -D - "$@" | tr -d '\r' || true; }
status_of() { curl -s -o /dev/null -w '%{http_code}' "$@" || true; }
body_of() { curl -s "$@" || true; }
has() { grep -qiF -- "$1" <<<"$2"; }   # has <needle> <haystack>, case-insensitive

home_html="$(body_of "$base/")"
[ "$(status_of "$base/")" = 200 ] && pass "/ returns 200" || fail "/ returns 200"
has "Make good decisions" "$home_html" && pass "/ contains the hero headline" || fail "/ contains the hero headline"
has '<link rel="canonical" href="https://smoke.example/"' "$home_html" && pass "SITE_URL reaches the canonical link" || fail "SITE_URL reaches the canonical link"
robots="$(body_of "$base/robots.txt")"
has "https://smoke.example/sitemap-index.xml" "$robots" && pass "SITE_URL reaches robots.txt" || fail "SITE_URL reaches robots.txt"
sitemap="$(body_of "$base/sitemap-0.xml")"
has "https://smoke.example/" "$sitemap" && pass "SITE_URL reaches the sitemap" || fail "SITE_URL reaches the sitemap"

health="$(body_of "$base/healthz")"
[ "$(status_of "$base/healthz")" = 200 ] && [ "$health" = ok ] && pass "/healthz returns 200 ok" || fail "/healthz returns 200 ok"

[ "$(status_of "$base/nope")" = 404 ] && pass "/nope returns 404" || fail "/nope returns 404"
has "Off the map" "$(body_of "$base/nope")" && pass "404 body is the custom page" || fail "404 body is the custom page"
[ "$(status_of "$base/da/nope")" = 404 ] && pass "/da/nope returns 404" || fail "/da/nope returns 404"
has "Uden for kortet" "$(body_of "$base/da/nope")" && pass "/da/nope body is the Danish 404 page" || fail "/da/nope body is the Danish 404 page"

# A directory-style URL must not redirect to an absolute URL with the internal port.
imprint_headers="$(headers_of "$base/imprint/")"
has "location:" "$imprint_headers" && fail "/imprint/ redirects" || pass "/imprint/ does not redirect"
[ "$(status_of "$base/imprint")" = 200 ] && pass "/imprint returns 200" || fail "/imprint returns 200"

gzip_headers="$(headers_of -H 'Accept-Encoding: gzip' "$base/")"
has "content-encoding: gzip" "$gzip_headers" && pass "/ is gzip-compressed" || fail "/ is gzip-compressed"

css_path="$(grep -o '/_astro/[^"]*\.css' <<<"$home_html" | head -1 || true)"
[ -n "$css_path" ] && pass "found a stylesheet in the HTML ($css_path)" || fail "found a stylesheet in the HTML"
has "immutable" "$(headers_of "$base$css_path" | grep -i '^cache-control:' || true)" && pass "/_astro/ file is immutable" || fail "/_astro/ file is immutable"
has "no-cache" "$(headers_of "$base/" | grep -i '^cache-control:' || true)" && pass "HTML is no-cache" || fail "HTML is no-cache"
has "max-age=86400" "$(headers_of "$base/favicon.svg" | grep -i '^cache-control:' || true)" && pass "favicon is cached for one day" || fail "favicon is cached for one day"

security_headers=(
  "content-security-policy: default-src 'self'; script-src 'self' https://scripts.withcabin.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://ping.withcabin.com; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
  "x-content-type-options: nosniff"
  "x-frame-options: DENY"
  "referrer-policy: strict-origin-when-cross-origin"
  "permissions-policy: camera=(), microphone=(), geolocation=()"
  "cross-origin-opener-policy: same-origin"
)
for target in "/" "$css_path" "/nope" "/healthz"; do
  got="$(headers_of "$base$target" | tr '[:upper:]' '[:lower:]')"
  for header in "${security_headers[@]}"; do
    grep -qxF -- "$(tr '[:upper:]' '[:lower:]' <<<"$header")" <<<"$got" && pass "$target has ${header%%:*}" || fail "$target has ${header%%:*}"
  done
  has "server: nginx/" "$got" && fail "$target leaks the nginx version" || true
  has "set-cookie:" "$got" && fail "$target sets a cookie" || pass "$target sets no cookie"
done
has "strict-transport-security" "$(headers_of "$base/")" && fail "HSTS must not be sent by the container" || pass "no HSTS (the proxy owns TLS)"

container="$(cd "$tmp" && docker compose -p "$project" ps -q web || true)"
health_status="$(docker inspect -f '{{.State.Health.Status}}' "$container" || true)"
[ "$health_status" = healthy ] && pass "health check is healthy" || fail "health check is healthy ($health_status)"
uid="$(docker exec "$container" id -u || true)"
[ -n "$uid" ] && [ "$uid" != 0 ] && pass "runs as non-root (uid $uid)" || fail "runs as non-root (uid '$uid')"
readonly_fs="$(docker inspect -f '{{.HostConfig.ReadonlyRootfs}}' "$container" || true)"
[ "$readonly_fs" = true ] && pass "root filesystem is read-only" || fail "root filesystem is read-only"

size="$(docker image inspect "$image" --format '{{.Size}}' || true)"
echo "  info image size: $((${size:-0} / 1024 / 1024)) MB"

if [ "$failures" -ne 0 ]; then
  echo "$failures check(s) failed"
  exit 1
fi
echo "All checks passed"
