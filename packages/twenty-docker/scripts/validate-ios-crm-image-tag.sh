#!/usr/bin/env bash

set -euo pipefail

image_tag="${1:-}"

if [[ ! "$image_tag" =~ ^[0-9a-f]{40}$ ]]; then
  echo 'IOS CRM image tag must be exactly a 40-character lowercase git SHA' >&2
  exit 1
fi
