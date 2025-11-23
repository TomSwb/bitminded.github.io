#!/bin/bash
# Compare table structures between dev and prod schemas

# Navigate to project root (where supabase/ directory is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔍 Comparing Table Structures"
echo "=============================="
echo ""

# Extract table names from both schemas
echo "📋 Extracting table names..."
DEV_TABLES=$(grep -E "^CREATE TABLE|^CREATE TABLE IF NOT EXISTS" supabase/exports/schema-dev.sql | sed 's/.*"public"\."\([^"]*\)".*/\1/' | sort)
PROD_TABLES=$(grep -E "^CREATE TABLE" supabase/exports/schema-prod.sql | sed 's/.*public\.\([a-z_]*\).*/\1/' | sort)

echo "   Dev tables: $(echo "$DEV_TABLES" | wc -l)"
echo "   Prod tables: $(echo "$PROD_TABLES" | wc -l)"
echo ""

# Compare table lists
echo "📊 Table List Comparison:"
echo "-------------------------"
MISSING_IN_PROD=$(comm -23 <(echo "$DEV_TABLES") <(echo "$PROD_TABLES"))
MISSING_IN_DEV=$(comm -13 <(echo "$DEV_TABLES") <(echo "$PROD_TABLES"))

if [ -z "$MISSING_IN_PROD" ] && [ -z "$MISSING_IN_DEV" ]; then
    echo "✅ All tables present in both schemas"
else
    if [ -n "$MISSING_IN_PROD" ]; then
        echo "⚠️  Tables in DEV but not in PROD:"
        echo "$MISSING_IN_PROD" | sed 's/^/   - /'
    fi
    if [ -n "$MISSING_IN_DEV" ]; then
        echo "⚠️  Tables in PROD but not in DEV:"
        echo "$MISSING_IN_DEV" | sed 's/^/   - /'
    fi
fi
echo ""

# Extract and normalize table structures for comparison
echo "🔍 Extracting table structures..."
mkdir -p /tmp/schema-compare

# Extract each table from dev schema
echo "$DEV_TABLES" | while read table; do
    # Extract table definition (from CREATE TABLE to closing semicolon)
    awk "/CREATE TABLE.*\"$table\"/,/;/" supabase/exports/schema-dev.sql | \
        sed 's/"//g' | \
        sed 's/public\.//g' | \
        sed 's/IF NOT EXISTS //g' | \
        sed 's/^[[:space:]]*//' | \
        sed 's/[[:space:]]*$//' | \
        grep -v "^$" | \
        sed 's/^--.*$//' | \
        sed 's/COMMENT ON.*$//' | \
        sed 's/ALTER TABLE.*$//' | \
        sed 's/OWNER TO.*$//' | \
        tr -s ' ' | \
        sort > "/tmp/schema-compare/dev-$table.txt" 2>/dev/null || true
done

# Extract each table from prod schema
echo "$PROD_TABLES" | while read table; do
    # Extract table definition
    awk "/CREATE TABLE.*$table/,/;/" supabase/exports/schema-prod.sql | \
        sed 's/"//g' | \
        sed 's/public\.//g' | \
        sed 's/^[[:space:]]*//' | \
        sed 's/[[:space:]]*$//' | \
        grep -v "^$" | \
        tr -s ' ' | \
        sort > "/tmp/schema-compare/prod-$table.txt" 2>/dev/null || true
done

# Compare each table
echo ""
echo "📋 Detailed Table Structure Comparison:"
echo "========================================"
DIFFERENCES_FOUND=false

echo "$DEV_TABLES" | while read table; do
    if [ -f "/tmp/schema-compare/dev-$table.txt" ] && [ -f "/tmp/schema-compare/prod-$table.txt" ]; then
        if ! diff -q "/tmp/schema-compare/dev-$table.txt" "/tmp/schema-compare/prod-$table.txt" > /dev/null 2>&1; then
            echo ""
            echo "⚠️  Differences in table: $table"
            echo "   ---"
            diff -u "/tmp/schema-compare/dev-$table.txt" "/tmp/schema-compare/prod-$table.txt" | head -30 || true
            DIFFERENCES_FOUND=true
        fi
    fi
done

if [ "$DIFFERENCES_FOUND" = false ]; then
    echo "✅ All table structures match!"
fi

echo ""
echo "✅ Table structure comparison complete!"
echo ""
echo "💡 Next steps:"
echo "   - Compare functions"
echo "   - Compare triggers"
echo "   - Compare RLS policies"

