#!/bin/bash
# Fingerprint the imported database so a post-refactor import can be compared to it.
# Usage: data/snapshot-db.sh <output-dir>
set -euo pipefail

OUT="${1:?usage: snapshot-db.sh <output-dir>}"

# The same variables the CLI reads, so a snapshot is taken of whatever was just
# imported. DB_CONTAINER routes through docker exec for a local container;
# unset, it uses the mariadb client directly, which is what CI needs - there the
# database is a service with no container to exec into.
DB="${DATABASE_NAME:-dtd2mysql}"
HOST="${DATABASE_HOSTNAME:-127.0.0.1}"
USER="${DATABASE_USERNAME:-root}"
PASS="${DATABASE_PASSWORD:-}"
CONTAINER="${DB_CONTAINER:-}"
mkdir -p "$OUT"

# The MariaDB-named tools are not everywhere - a GitHub runner ships the MySQL
# client and not mariadb-dump - and they are drop-in for what this needs.
have() { command -v "$1" > /dev/null 2>&1; }

tool_for() {
  case "$1" in
    mariadb) have mariadb && echo mariadb || echo mysql ;;
    mariadb-dump) have mariadb-dump && echo mariadb-dump || echo mysqldump ;;
  esac
}

client() {
  local tool="$1"; shift

  if [ -n "$CONTAINER" ]; then
    docker exec "$CONTAINER" "$tool" -u"$USER" ${PASS:+-p"$PASS"} "$@"
  else
    "$(tool_for "$tool")" -h "$HOST" -u"$USER" ${PASS:+-p"$PASS"} "$@"
  fi
}

m() { client mariadb --skip-column-names -B "$DB" -e "$1"; }

# 1. Schema DDL. --skip-dump-date so identical schemas produce identical files.
client mariadb-dump --no-data --skip-dump-date --skip-comments "$DB" > "$OUT/schema.sql"

# 2. Per-table row count and content hash, ordered by primary key so the hash is
#    stable regardless of storage order.
TABLES=$(m "SELECT table_name FROM information_schema.tables
           WHERE table_schema='$DB' ORDER BY table_name")

: > "$OUT/tables.tsv"
printf 'table\trows\tsha256\n' >> "$OUT/tables.tsv"
for t in $TABLES; do
  rows=$(m "SELECT COUNT(*) FROM \`$t\`")
  hash=$(client mariadb-dump --compact --no-create-info \
           --order-by-primary --skip-extended-insert "$DB" "$t" | sha256sum | cut -d' ' -f1)
  printf '%s\t%s\t%s\n' "$t" "$rows" "$hash" >> "$OUT/tables.tsv"
done

# 3. Column definitions, so a type or nullability change is visible even when
#    the row hash happens to match.
m "SELECT CONCAT_WS('\t', table_name, ordinal_position, column_name,
                    column_type, is_nullable, IFNULL(column_default,'NULL'))
   FROM information_schema.columns WHERE table_schema='$DB'
   ORDER BY table_name, ordinal_position" > "$OUT/columns.tsv"

echo "wrote $OUT: $(wc -l < "$OUT/tables.tsv") tables, $(wc -l < "$OUT/columns.tsv") columns"
