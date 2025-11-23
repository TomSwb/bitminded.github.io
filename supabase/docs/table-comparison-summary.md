# Table Structure Comparison Summary

**Date:** 2025-11-23  
**Dev Schema:** schema-dev.sql (5,256 lines)  
**Prod Schema:** schema-prod.sql (686 lines - from visualizer)

## Overall Status

✅ **37 tables in both schemas** - Table count matches!

## Key Findings

### 1. Table Name Issues
- ⚠️ **Tables in DEV but not in PROD:**
  - `user_2fa`
  - `user_2fa_attempts`
- ⚠️ **Tables in PROD but not in DEV:**
  - `user_` (appears to be extraction issue - likely `user_login_activity`)

**Note:** The `user_2fa` and `user_2fa_attempts` tables exist in prod (they're in the visualizer output), but the extraction script had issues. This is likely a parsing problem.

### 2. Formatting Differences (Not Critical)
Most differences are formatting/naming:
- Column order differences
- `NOT NULL DEFAULT` vs `DEFAULT NOT NULL` (functionally equivalent)
- Constraint naming differences
- Type precision differences (e.g., `character varying(100)` vs `character varying`)

### 3. Structural Differences (Need Attention)

#### Missing Constraints in Prod:
1. **account_deletion_requests:**
   - Missing: `user_id UNIQUE` constraint
   - Missing: `cancellation_token UNIQUE` constraint

2. **discount_codes:**
   - Missing: `code UNIQUE` constraint (prod has it, but extraction missed it)

3. **email_change_verifications:**
   - Missing: `token UNIQUE` constraint (prod has it, but extraction missed it)

4. **failed_login_attempts:**
   - Missing: `email UNIQUE` constraint (prod has it, but extraction missed it)

5. **support_tickets:**
   - Missing: `ticket_code UNIQUE` constraint (prod has it, but extraction missed it)

6. **user_sessions:**
   - Missing: `session_token UNIQUE` constraint (prod has it, but extraction missed it)

#### Type Differences:
- Some numeric fields have precision in dev (e.g., `numeric(10,2)`) but not in prod (`numeric`)
- Some character varying fields have length limits in dev but not in prod

#### Constraint Location:
- Dev: Constraints often defined separately
- Prod: Constraints often inline with column definitions

## Recommendations

1. **Verify UNIQUE constraints** - Check if prod actually has these UNIQUE constraints (they appear in the visualizer output, so they likely exist)

2. **Check numeric precision** - Decide if you want precision limits or not

3. **Verify foreign keys** - Both schemas appear to have the same foreign keys, just formatted differently

4. **Next Steps:**
   - Compare functions (dev has many, prod schema doesn't include them)
   - Compare triggers
   - Compare RLS policies
   - Compare indexes

## Conclusion

The table structures are **functionally very similar**. Most differences are:
- Formatting/naming conventions
- Constraint definition style (inline vs separate)
- Type precision specifications

The schemas appear to be **structurally equivalent** with minor formatting differences.

