#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${ORACLE_USER:-}" || -z "${ORACLE_PASSWORD:-}" || -z "${ORACLE_CONNECT_STRING:-}" ]]; then
  echo "ORACLE_USER, ORACLE_PASSWORD, and ORACLE_CONNECT_STRING are required." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCHEMA_FILE:-$SCRIPT_DIR/../../../oracle/webtoon-platform-oracle.sql}"

if ! command -v sqlplus >/dev/null 2>&1; then
  echo "sqlplus is required on the Oracle server." >&2
  exit 1
fi

sqlplus -L "$ORACLE_USER/$ORACLE_PASSWORD@$ORACLE_CONNECT_STRING" @"$SCHEMA_FILE"
