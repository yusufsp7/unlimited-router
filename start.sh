<<<<<<< HEAD
docker stop 9router
docker rm 9router
docker build -t 9router .
docker run -d --name 9router -p 20128:20128 --env-file .env -v 9router-data:/app/data 9router
=======
#!/usr/bin/env bash
# Unlimited Router — start tray/server
DIR="$(cd "$(dirname "$0")" && pwd)"
if [ "$(uname)" = "Darwin" ]; then
  DATA_DIR="$HOME/Library/Application Support/urouter"
else
  DATA_DIR="$HOME/.urouter"
fi
mkdir -p "$DATA_DIR"
[ -f "$DATA_DIR/.env" ] || printf 'JWT_SECRET=urouter-local-secret\nINITIAL_PASSWORD=123456\n' > "$DATA_DIR/.env"
exec node "$DIR/cli/cli.js" --tray --host 127.0.0.1 --port 20128 "$@"
>>>>>>> release4
