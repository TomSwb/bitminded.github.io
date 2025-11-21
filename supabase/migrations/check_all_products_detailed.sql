-- Query: Check ALL Products (Including Test Products)
-- Purpose: See all products in database with their publish status
-- Usage: Run this on PROD database to see all products
-- Created: 2025-11-21

-- Show ALL products with detailed status
SELECT 
    id,
    name,
    slug,
    status,
    -- Check if it's a test product
    CASE 
        WHEN name LIKE 'Test %' OR stripe_product_id LIKE 'prod_test_%' THEN 'YES'
        ELSE 'NO'
    END AS is_test_product,
    -- Check each required field
    CASE 
        WHEN github_repo_url IS NULL AND github_repo_name IS NULL THEN 'MISSING'
        ELSE 'OK'
    END AS github_status,
    CASE 
        WHEN cloudflare_domain IS NULL AND cloudflare_worker_url IS NULL THEN 'MISSING'
        ELSE 'OK'
    END AS cloudflare_status,
    CASE 
        WHEN stripe_product_id IS NULL THEN 'MISSING'
        ELSE 'OK'
    END AS stripe_status,
    CASE 
        WHEN icon_url IS NULL THEN 'MISSING'
        ELSE 'OK'
    END AS icon_status,
    -- Show actual values
    COALESCE(github_repo_url, github_repo_name, 'NULL') AS github_value,
    COALESCE(cloudflare_domain, cloudflare_worker_url, 'NULL') AS cloudflare_value,
    COALESCE(stripe_product_id, 'NULL') AS stripe_value,
    COALESCE(icon_url, 'NULL') AS icon_value,
    -- Calculate if product can be published (test products skip validation)
    CASE 
        WHEN name LIKE 'Test %' OR stripe_product_id LIKE 'prod_test_%' THEN 'CAN PUBLISH (TEST)'
        WHEN (github_repo_url IS NULL AND github_repo_name IS NULL) 
          OR (cloudflare_domain IS NULL AND cloudflare_worker_url IS NULL)
          OR stripe_product_id IS NULL
          OR icon_url IS NULL
        THEN 'CANNOT PUBLISH'
        ELSE 'CAN PUBLISH'
    END AS publish_status,
    -- List missing fields (only for non-test products)
    CASE 
        WHEN name LIKE 'Test %' OR stripe_product_id LIKE 'prod_test_%' THEN ARRAY[]::text[]
        ELSE ARRAY_REMOVE(ARRAY[
            CASE WHEN github_repo_url IS NULL AND github_repo_name IS NULL THEN 'GitHub repository' END,
            CASE WHEN cloudflare_domain IS NULL AND cloudflare_worker_url IS NULL THEN 'Cloudflare configuration' END,
            CASE WHEN stripe_product_id IS NULL THEN 'Stripe product' END,
            CASE WHEN icon_url IS NULL THEN 'Product icon' END
        ], NULL)
    END AS missing_fields
FROM products
ORDER BY 
    CASE 
        WHEN name LIKE 'Test %' OR stripe_product_id LIKE 'prod_test_%' THEN 2
        WHEN (github_repo_url IS NULL AND github_repo_name IS NULL) 
          OR (cloudflare_domain IS NULL AND cloudflare_worker_url IS NULL)
          OR stripe_product_id IS NULL
          OR icon_url IS NULL
        THEN 0
        ELSE 1
    END,
    name;

