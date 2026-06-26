#!/usr/bin/env bash
set -euo pipefail

VPS="sysadmin@10.10.14.14"
REMOTE_DIR="~/sppg-scraper"
LOCAL_DIR="/Users/leksa/Development/data-bgn"

echo "[1] Checking for CSV on VPS..."
CSV_FILE=$(ssh "$VPS" "ls -t $REMOTE_DIR/sppg_data_*.csv 2>/dev/null | head -1" || true)

if [ -z "$CSV_FILE" ]; then
    echo "No CSV found on VPS. Checking if scraper is still running..."
    if ssh "$VPS" "ps -p 273646 >/dev/null 2>&1"; then
        echo "Scraper still running. Progress:"
        ssh "$VPS" "tail -c 200 $REMOTE_DIR/scraping.log"
    else
        echo "Scraper not running. Checking log for status..."
        ssh "$VPS" "tail -5 $REMOTE_DIR/scraping.log"
    fi
    exit 1
fi

echo "Found: $(basename "$CSV_FILE")"

echo "[2] Copying CSV from VPS..."
scp "$VPS:$CSV_FILE" "$LOCAL_DIR/"
LOCAL_CSV="$LOCAL_DIR/$(basename "$CSV_FILE")"
echo "  -> $LOCAL_CSV"

echo "[3] Mapping kode_wilayah..."
python3 "$LOCAL_DIR/map_wilayah.py" "$LOCAL_CSV"
MAPPED_CSV="${LOCAL_CSV%.csv}_mapped.csv"

if [ -f "$MAPPED_CSV" ]; then
    ROWS=$(tail -n +2 "$MAPPED_CSV" | wc -l | tr -d ' ')
    echo "Done! $ROWS entries, output: $MAPPED_CSV"
else
    echo "ERROR: mapping failed"
    exit 1
fi
