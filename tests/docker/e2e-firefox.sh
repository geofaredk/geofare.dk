#!/usr/bin/env bash
# Runs the Firefox browser tests where Playwright's own Firefox does not start on the host
# (macOS 27 at the time of writing): the site runs in its own container, and the tests run in
# Playwright's official Linux image, against that container.
#
# - The site is built from the working tree (not only what is committed) under its own compose
#   project, image tag and port, so it never touches the real geofare stack.
# - The Playwright image matches the installed @playwright/test version. It is pulled if missing
#   and never removed by this script (it is large and reused); remove it yourself with
#   `docker image rm mcr.microsoft.com/playwright:v<version>-noble` when you no longer need it.
# - Everything else this script starts is removed when it ends.
set -euo pipefail

project=geofare-e2e
image=geofare-website-e2e    # its own tag: never the real geofare-website image
runner=geofare-e2e-firefox   # name of the one-off test container
port="${E2E_PORT:-18082}"
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
version="$(node -p "require('$repo/node_modules/@playwright/test/package.json').version")"
playwright_image="mcr.microsoft.com/playwright:v${version}-noble"
started=0

cleanup() {
  # Only what this run created: its test container, its compose project's container and network, its image tag.
  docker rm -f "$runner" >/dev/null 2>&1 || true
  if [ "$started" = 1 ]; then
    (cd "$repo" && GEOFARE_IMAGE=$image GEOFARE_PORT=$port docker compose -p "$project" down --remove-orphans >/dev/null 2>&1) || true
    docker image rm "$image" >/dev/null 2>&1 || true
  fi
}

# Refuse to adopt anything that is already there.
if [ -n "$(docker ps -a -q --filter "label=com.docker.compose.project=$project" || true)" ]; then
  echo "A container of compose project $project already exists. Remove it yourself first: docker compose -p $project down" >&2
  exit 2
fi
if docker image inspect "$image" >/dev/null 2>&1; then
  echo "An image named $image already exists. Remove it yourself first: docker image rm $image" >&2
  exit 2
fi
if docker container inspect "$runner" >/dev/null 2>&1; then
  echo "A container named $runner already exists. Remove it yourself first: docker rm $runner" >&2
  exit 2
fi
trap cleanup EXIT

echo "Starting the site from the working tree on port $port (compose project $project)"
started=1
(cd "$repo" && GEOFARE_IMAGE=$image GEOFARE_PORT=$port docker compose -p "$project" up -d --build --wait)

echo "Running the Firefox tests in $playwright_image"
# The repository is mounted read-only: the list reporter writes to the terminal, results go to
# /tmp/results inside the container, and Playwright's transform cache lives in the container's /tmp.
docker run --rm --name "$runner" \
  -v "$repo":/work:ro -w /work \
  -e E2E_BASE_URL="http://host.docker.internal:$port" \
  --add-host=host.docker.internal:host-gateway \
  "$playwright_image" \
  node node_modules/@playwright/test/cli.js test --project=firefox --output=/tmp/results "$@"
