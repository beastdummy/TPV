#!/usr/bin/env bash
# Reinstala dependencias en Linux (WSL). Usar SIEMPRE que desarrolles con npm run dev en WSL.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "${NVM_DIR:-$HOME/.nvm}/nvm.sh" 2>/dev/null || true

for dir in the-hard-blok-tpv the-hard-blok-web; do
  echo ">>> $dir"
  cd "$ROOT/$dir"
  if [[ -d node_modules ]]; then
    rm -rf node_modules || {
      echo "No se pudo borrar node_modules en $dir (archivos bloqueados)."
      echo "Cierra node/vite, renombra la carpeta desde Windows y vuelve a ejecutar."
      exit 1
    }
  fi
  npm install
  echo "    @rolldown: $(ls node_modules/@rolldown 2>/dev/null | tr '\n' ' ')"
done

echo "Listo. TPV: npm run dev (3000), web: npm run dev (3001)"
