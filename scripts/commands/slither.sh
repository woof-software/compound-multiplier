#!/usr/bin/env bash
set -uo pipefail

# --- Проверка наличия Slither ---
if ! command -v slither > /dev/null 2>&1; then
    echo "❌ Slither is not found."
    echo "Please install Slither from:"
    echo "https://github.com/crytic/slither#how-to-install"
    exit 1
fi

REPORT_PATH="./SLITHER_REPORT.md"
TMP_OUTPUT_FILE="./slither-cmd-output.txt"

echo "🧩 Compiling contracts..."
npx hardhat compile --quiet

echo "🔍 Running Slither..."
# Важно: добавляем || true, чтобы не падал при exit 255
slither . \
  --checklist \
  --exclude "naming-convention,solc-version,similar-names,timestamp" \
  --exclude-paths "node_modules,hardhat,@openzeppelin,contracts/interfaces,contracts/mocks,contracts/vendor,contracts-exposed,contracts/external,contracts/misc" \
  > "$REPORT_PATH" 2> "$TMP_OUTPUT_FILE" || true

echo "🧾 Preparing the Slither report..."
{
  echo ""
  echo "* * *"
  echo ""
  cat "$TMP_OUTPUT_FILE"
} >> "$REPORT_PATH"

rm -f "$TMP_OUTPUT_FILE"

echo ""
echo "✅ The Slither report is stored in $REPORT_PATH."
