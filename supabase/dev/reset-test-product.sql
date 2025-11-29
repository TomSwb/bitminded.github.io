-- Reset/Delete "test" product from database
-- Run this in the Supabase SQL Editor for dev environment
-- Project: eygpejbljuqpxwwoawkn

-- First, let's see what we're deleting
SELECT 
    id,
    name,
    slug,
    status,
    github_repo_name,
    github_repo_url,
    stripe_product_id,
    created_at
FROM products 
WHERE slug = 'test';

-- Check if product is in any bundles
SELECT 
    id,
    name,
    slug,
    product_ids
FROM product_bundles
WHERE (SELECT id FROM products WHERE slug = 'test') = ANY(product_ids);

-- Check for any purchases (should be none for a test product)
SELECT COUNT(*) as purchase_count
FROM product_purchases
WHERE product_id = (SELECT id FROM products WHERE slug = 'test');

-- Remove product from any bundles (update product_ids array)
UPDATE product_bundles
SET product_ids = array_remove(product_ids, (SELECT id FROM products WHERE slug = 'test'))
WHERE (SELECT id FROM products WHERE slug = 'test') = ANY(product_ids);

-- Delete the product (this will cascade delete any purchases due to ON DELETE CASCADE)
DELETE FROM products
WHERE slug = 'test';

-- Verify deletion
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM products WHERE slug = 'test') 
        THEN 'Product still exists - deletion failed'
        ELSE 'Product successfully deleted'
    END as deletion_status;

