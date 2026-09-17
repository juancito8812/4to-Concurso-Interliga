#!/usr/bin/env bash
# run-rls-tests.sh — Verifica en un Postgres desechable que las reglas del concurso
# realmente se aplican en la BASE (no solo en el cliente).
#
# Levanta un contenedor temporal con postgres:15-alpine, emula el entorno de Supabase
# (roles anon/authenticated, schema auth con auth.uid()), aplica supabase/schema.sql y
# la migración de seguridad, y ejecuta supabase/tests/02_rls_security_test.sql como rol
# `authenticated` dentro de transacciones con ROLLBACK (no persiste nada).
#
# Uso:  ./supabase/tests/run-rls-tests.sh
# Requiere: docker con la imagen postgres:15-alpine.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER="interliga-rls-tests"
PORT="${PORT:-55433}"
IMAGE="postgres:15-alpine"

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

echo "▶ Levantando $IMAGE en el puerto $PORT..."
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p "$PORT:5432" "$IMAGE" >/dev/null

for _ in $(seq 1 30); do
  docker exec "$CONTAINER" pg_isready -U postgres -d test >/dev/null 2>&1 && break
  sleep 1
done

psql_run() { docker exec -i "$CONTAINER" psql -U postgres -d test "$@"; }

echo "▶ Aplicando shim de Supabase + schema.sql + migración de seguridad..."
{
  cat "$ROOT/supabase/tests/00_supabase_shim.sql"
  cat "$ROOT/supabase/schema.sql"
  cat "$ROOT/supabase/migrations/2026-09-16_security_hardening.sql"
  cat "$ROOT/supabase/tests/01_grants.sql"
} | psql_run -q -v ON_ERROR_STOP=1 >/dev/null

echo "▶ Ejecutando casos de prueba (RLS como rol authenticated)..."
OUTPUT="$(cat "$ROOT/supabase/tests/02_rls_security_test.sql" | psql_run -v ON_ERROR_STOP=1 2>&1)"
echo "$OUTPUT" | grep -E "✅|❌" | sed 's/^NOTICE:  //'

FAILED="$(echo "$OUTPUT" | grep -c "❌" || true)"
PASSED="$(echo "$OUTPUT" | grep -c "✅" || true)"

echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "🎉 RLS VERIFICADA: $PASSED casos OK, 0 fallos"
else
  echo "🔴 $FAILED fallos de $((PASSED + FAILED)) casos"
  exit 1
fi
