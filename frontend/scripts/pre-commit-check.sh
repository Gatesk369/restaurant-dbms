#!/usr/bin/env bash
set -euo pipefail

npm_script="${1:?Pass the npm script to run}"
if [[ "${CI:-}" == "true" ]]; then
  echo "Skipping npm run ${npm_script}; the frontend CI job runs this check."
  exit 0
fi

exec npm --prefix frontend run "${npm_script}"
