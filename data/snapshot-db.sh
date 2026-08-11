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

# mariadb-dump specifically, not mysqldump. They are not interchangeable here:
# a fingerprint is a hash of dump output, so two tools that format a row
# differently produce different hashes for identical data, and a baseline cut
# with one would never match a check run with the other. mysqldump also queries
# information_schema.COLUMN_STATISTICS, which MariaDB does not have.
if [ -z "${CONTAINER:-}" ]; then
  for tool in mariadb mariadb-dump; do
    command -v "$tool" > /dev/null 2>&1 || {
      echo "$tool is needed and not on PATH." >&2
      echo "A fingerprint is a hash of its output, so mysqldump is not a substitute." >&2
      echo "  apt-get install mariadb-client   /   brew install mariadb" >&2
      exit 1
    }
  done
fi

client() {
  local tool="$1"; shift

  if [ -n "$CONTAINER" ]; then
    docker exec "$CONTAINER" "$tool" -u"$USER" ${PASS:+-p"$PASS"} "$@"
  else
    "$tool" -h "$HOST" -u"$USER" ${PASS:+-p"$PASS"} "$@"
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
