#!/usr/bin/env bash
# Unlimited Router — macOS/Linux installer
set -e
cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "   Unlimited Router - Installer"
echo "========================================"
echo ""

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 20 ]; then
  echo "[!!] Node.js 20+ diperlukan. Unduh dari https://nodejs.org (paket LTS)."
  exit 1
fi

echo "[1/4] Mengunduh dependensi..."
npm install --no-audit --no-fund

echo "[2/4] Membangun aplikasi..."
npm run build:turbo
node scripts/copy-standalone-assets.mjs

echo "[3/4] Menyiapkan CLI..."
rm -rf cli/app
cp -r .next/standalone cli/app

echo "[4/4] Menyiapkan launcher..."
chmod +x start.sh 2>/dev/null || true

echo ""
echo "========================================"
echo "   Installation complete!"
echo "========================================"
echo " Mulai dengan:  ./start.sh"
echo " Dashboard:     http://localhost:20128  (password: 123456)"
echo ""
