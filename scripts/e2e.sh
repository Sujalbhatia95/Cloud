#!/usr/bin/env bash
# Builds the app with the test environment and runs the Playwright acceptance suite.
set -euo pipefail
cd "$(dirname "$0")/.."
eval "$(npx tsx -e "import { E2E_ENV } from './tests/e2e/env'; for (const [k, v] of Object.entries(E2E_ENV)) console.log('export ' + k + '=' + JSON.stringify(v));")"
npx next build
npx playwright test "$@"
