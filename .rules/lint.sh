#!/bin/bash

# Run tsgo, biome lint, tailwindcss in parallel
npx tsgo -p tsconfig.check.json &
pid_tsgo=$!

npx biome lint &
pid_biome=$!

npx tailwindcss -i ./src/index.css -o /dev/null 2>&1 &
pid_tw=$!

# Wait and collect exit codes
fail=0

wait $pid_tsgo || fail=1
wait $pid_biome || fail=1
wait $pid_tw || fail=1

if [ $fail -ne 0 ]; then
  exit 1
fi

# All lint passed, run build
.rules/testBuild.sh
