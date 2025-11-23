#!/bin/bash
# Automated Database Comparison Script
# Compares dev and prod Supabase databases

set -e

DEV_PROJECT="eygpejbljuqpxwwoawkn"
PROD_PROJECT="dynxqnrkmjcvgzsugxtm"

echo "🔍 Supabase Database Comparison Tool"
echo "======================================"
echo ""

# Navigate to project root (where supabase/ directory is)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    echo "   Run: sudo systemctl start docker"
    exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    exit 1
fi

# Check if dev schema already exists and is valid
if [ -f supabase/exports/schema-dev.sql ] && [ -s supabase/exports/schema-dev.sql ]; then
    DEV_LINES=$(wc -l < supabase/exports/schema-dev.sql)
    echo "📋 Step 1: DEV schema already exists, skipping..."
    echo "   ✅ Using existing dev schema ($DEV_LINES lines)"
    DEV_DUMPED=true
else
    echo "📋 Step 1: Linking to DEV project..."
    # Check if already linked to this project
    CURRENT_LINKED=$(supabase projects list 2>/dev/null | grep "●" | awk '{print $4}' || echo "")
    if [ "$CURRENT_LINKED" = "$DEV_PROJECT" ]; then
        echo "   ✅ Already linked to DEV project, skipping..."
    else
        echo "   Linking to DEV project (this may take a moment)..."
        timeout 30 supabase link --project-ref $DEV_PROJECT --password "" 2>&1 | grep -v "password" || {
            echo "   ⚠️  Link failed or timed out. Continuing anyway (may still work if previously linked)..."
        }
    fi

    echo ""
    echo "📥 Step 2: Dumping DEV schema..."
    # Use db dump with retries (connection pool can timeout)
    MAX_RETRIES=3
    RETRY_COUNT=0
    DEV_DUMPED=false

    while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$DEV_DUMPED" = false ]; do
        if [ $RETRY_COUNT -gt 0 ]; then
            echo "   Retry attempt $RETRY_COUNT of $MAX_RETRIES..."
            sleep 5
        fi
        
        # Run dump and show progress (filter out Docker pull noise but show important messages)
        echo "   Attempting dump (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
        supabase db dump --linked --schema public -f supabase/exports/schema-dev.sql 2>&1 | \
            grep -v "Pulling\|Digest\|Status\|Downloaded\|Pull complete\|Layer\|Pulling fs layer" | \
            grep -E "(Initialising|Connecting|Dumping|error|Error|ERROR|failed|Failed|FAILED|success|Success)" || true
        DUMP_EXIT=${PIPESTATUS[0]}
        
        # Check if file was created and has content (even if command had warnings)
        if [ -f supabase/exports/schema-dev.sql ] && [ -s supabase/exports/schema-dev.sql ]; then
            echo "   ✅ Dev schema dumped successfully"
            DEV_DUMPED=true
        else
            if [ $DUMP_EXIT -ne 0 ]; then
                echo "   ⚠️  Dump failed (exit code: $DUMP_EXIT), retrying..."
            else
                echo "   ⚠️  Dump completed but file is empty, retrying..."
            fi
            rm -f supabase/exports/schema-dev.sql
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
    done

    if [ "$DEV_DUMPED" = false ]; then
        echo "   ❌ Could not dump dev schema after $MAX_RETRIES attempts"
        echo "   💡 Tip: Try again later when connection pool is less busy"
    fi
fi

echo ""
echo "📋 Step 3: Linking to PROD project..."
# Check if already linked to this project
CURRENT_LINKED=$(supabase projects list 2>/dev/null | grep "●" | awk '{print $4}' || echo "")
if [ "$CURRENT_LINKED" = "$PROD_PROJECT" ]; then
    echo "   ✅ Already linked to PROD project, skipping..."
else
    echo "   Linking to PROD project (this may take a moment)..."
    timeout 30 supabase link --project-ref $PROD_PROJECT --password "" 2>&1 | grep -v "password" || {
        echo "   ⚠️  Link failed or timed out. Continuing anyway (may still work if previously linked)..."
    }
fi

echo ""
echo "📥 Step 4: Dumping PROD schema..."
# Use db dump with retries (connection pool can timeout)
MAX_RETRIES=3
RETRY_COUNT=0
PROD_DUMPED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ "$PROD_DUMPED" = false ]; do
    if [ $RETRY_COUNT -gt 0 ]; then
        echo "   Retry attempt $RETRY_COUNT of $MAX_RETRIES..."
        sleep 5
    fi
    
    # Run dump with timeout and show progress (filter out Docker pull noise but show important messages)
    echo "   Attempting dump (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
    echo "   (This may take 1-2 minutes, please wait...)"
    timeout 120 supabase db dump --linked --schema public -f supabase/exports/schema-prod.sql 2>&1 | \
        grep -v "Pulling\|Digest\|Status\|Downloaded\|Pull complete\|Layer\|Pulling fs layer" | \
        grep -E "(Initialising|Connecting|Dumping|error|Error|ERROR|failed|Failed|FAILED|success|Success|timeout|Timeout)" || true
    DUMP_EXIT=${PIPESTATUS[0]}
    
    # Check if timeout occurred
    if [ $DUMP_EXIT -eq 124 ]; then
        echo "   ⚠️  Dump timed out after 2 minutes, retrying..."
        rm -f supabase/exports/schema-prod.sql
    fi
    
    # Check if file was created and has content (even if command had warnings)
    if [ -f supabase/exports/schema-prod.sql ] && [ -s supabase/exports/schema-prod.sql ]; then
        echo "   ✅ Prod schema dumped successfully"
        PROD_DUMPED=true
    else
        if [ $DUMP_EXIT -ne 0 ]; then
            echo "   ⚠️  Dump failed (exit code: $DUMP_EXIT), retrying..."
        else
            echo "   ⚠️  Dump completed but file is empty, retrying..."
        fi
        rm -f supabase/exports/schema-prod.sql
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ "$PROD_DUMPED" = false ]; then
    echo "   ❌ Could not dump prod schema after $MAX_RETRIES attempts"
    echo "   💡 Tip: Try again later when connection pool is less busy"
fi

echo ""
echo "🔍 Step 5: Comparing schemas..."
# Check if both files exist and have content
if [ -f supabase/exports/schema-dev.sql ] && [ -s supabase/exports/schema-dev.sql ] && [ -f supabase/exports/schema-prod.sql ] && [ -s supabase/exports/schema-prod.sql ]; then
    if diff -u supabase/exports/schema-dev.sql supabase/exports/schema-prod.sql > supabase/exports/schema-diff.txt 2>&1; then
        echo "✅ Schemas are identical!"
        rm supabase/exports/schema-diff.txt
    else
        echo "⚠️  Differences found! Check supabase/exports/schema-diff.txt"
        echo ""
        echo "Summary of differences:"
        diff -u supabase/exports/schema-dev.sql supabase/exports/schema-prod.sql | head -50
    fi
elif [ ! -f supabase/exports/schema-dev.sql ] || [ ! -s supabase/exports/schema-dev.sql ]; then
    echo "❌ Dev schema file missing or empty - comparison skipped"
elif [ ! -f supabase/exports/schema-prod.sql ] || [ ! -s supabase/exports/schema-prod.sql ]; then
    echo "❌ Prod schema file missing or empty - comparison skipped"
else
    echo "⚠️  Could not compare - schema files not generated or are empty"
fi

echo ""
echo "📊 Step 6: Generating comparison report..."
cat > supabase/exports/comparison-report.md << 'EOF'
# Database Comparison Report
Generated: $(date)

## Schema Files
- Dev: `exports/schema-dev.sql`
- Prod: `exports/schema-prod.sql`
- Diff: `exports/schema-diff.txt` (if differences found)

## Quick Comparison

### Tables
Run in both databases:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### Functions
Run in both databases:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;
```

### Policies
Run in both databases:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

EOF

echo "✅ Comparison complete!"
echo ""
echo "📁 Files generated:"
echo "   - supabase/exports/schema-dev.sql"
echo "   - supabase/exports/schema-prod.sql"
if [ -f supabase/exports/schema-diff.txt ]; then
    echo "   - supabase/exports/schema-diff.txt (differences)"
fi
echo "   - supabase/exports/comparison-report.md"

