-- ============================================================================
-- CHECK CURRENT RLS POLICIES
-- ============================================================================
-- Purpose: Check what RLS policies actually exist in the database
-- This helps verify if the temporary permissive policies from 
-- 20250115_fix_admin_rls_policies.sql are still active or have been replaced
-- ============================================================================

-- 1. Check all RLS policies on product-related tables
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'products',
        'product_categories',
        'product_bundles',
        'product_purchases',
        'product_reviews',
        'product_maintenance',
        'product_analytics',
        'discount_codes',
        'ai_recommendations'
    )
ORDER BY tablename, policyname;

-- 2. Check for the specific "temporary" policies that allow any authenticated user
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND policyname LIKE '%Authenticated users can%'
ORDER BY tablename, policyname;

-- 3. Check for admin-only policies on product tables
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'products',
        'product_categories',
        'product_bundles',
        'product_purchases',
        'product_reviews',
        'product_maintenance',
        'product_analytics',
        'discount_codes'
    )
    AND (policyname LIKE '%Admin%' OR policyname LIKE '%admin%')
ORDER BY tablename, policyname;

-- 4. Check user_roles table policies (critical for admin checks)
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'user_roles'
ORDER BY policyname;

-- 5. Check if RLS is enabled on all product tables
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'products',
        'product_categories',
        'product_bundles',
        'product_purchases',
        'product_reviews',
        'product_maintenance',
        'product_analytics',
        'discount_codes',
        'ai_recommendations',
        'user_roles'
    )
ORDER BY tablename;

-- 6. Summary: Count policies per table
-- ============================================================================
SELECT 
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'products',
        'product_categories',
        'product_bundles',
        'product_purchases',
        'product_reviews',
        'product_maintenance',
        'product_analytics',
        'discount_codes',
        'ai_recommendations',
        'user_roles'
    )
GROUP BY tablename
ORDER BY tablename;

-- 7. Check for any policies that use auth.role() = 'authenticated' (too permissive)
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND (
        qual LIKE '%auth.role()%authenticated%' 
        OR with_check LIKE '%auth.role()%authenticated%'
    )
ORDER BY tablename, policyname;

-- 8. Check for policies that properly check admin role via user_roles table
-- ============================================================================
SELECT 
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND (
        qual LIKE '%user_roles%admin%' 
        OR with_check LIKE '%user_roles%admin%'
        OR qual LIKE '%role%admin%'
        OR with_check LIKE '%role%admin%'
    )
ORDER BY tablename, policyname;

