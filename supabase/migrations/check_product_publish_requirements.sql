-- Query: Check Product Publish Requirements
-- Purpose: Identify which products are missing required fields for publishing
-- Usage: Run this on PROD database to see which products can't be published
-- Created: 2025-11-21

-- Check all products and show which required fields are missing
SELECT 
    id,
    name,
    slug,
    status,
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
    -- Show actual values (for debugging)
    COALESCE(github_repo_url, github_repo_name, 'NULL') AS github_value,
    COALESCE(cloudflare_domain, cloudflare_worker_url, 'NULL') AS cloudflare_value,
    COALESCE(stripe_product_id, 'NULL') AS stripe_value,
    COALESCE(icon_url, 'NULL') AS icon_value,
    -- Calculate if product can be published
    CASE 
        WHEN (github_repo_url IS NULL AND github_repo_name IS NULL) 
          OR (cloudflare_domain IS NULL AND cloudflare_worker_url IS NULL)
          OR stripe_product_id IS NULL
          OR icon_url IS NULL
        THEN 'CANNOT PUBLISH'
        ELSE 'CAN PUBLISH'
    END AS publish_status,
    -- List missing fields
    ARRAY_REMOVE(ARRAY[
        CASE WHEN github_repo_url IS NULL AND github_repo_name IS NULL THEN 'GitHub repository' END,
        CASE WHEN cloudflare_domain IS NULL AND cloudflare_worker_url IS NULL THEN 'Cloudflare configuration' END,
        CASE WHEN stripe_product_id IS NULL THEN 'Stripe product' END,
        CASE WHEN icon_url IS NULL THEN 'Product icon' END
    ], NULL) AS missing_fields
FROM products
-- Include all products, even archived ones, to see everything
ORDER BY 
    CASE 
        WHEN (github_repo_url IS NULL AND github_repo_name IS NULL) 
          OR (cloudflare_domain IS NULL AND cloudflare_worker_url IS NULL)
          OR stripe_product_id IS NULL
          OR icon_url IS NULL
        THEN 0
        ELSE 1
    END,
    name;

-- Summary: Count products by publish status
SELECT 
    CASE 
        WHEN (github_repo_url IS NULL AND github_repo_name IS NULL) 
          OR (cloudflare_domain IS NULL AND cloudflare_worker_url IS NULL)
          OR stripe_product_id IS NULL
          OR icon_url IS NULL
        THEN 'Cannot Publish'
        ELSE 'Can Publish'
    END AS publish_status,
    COUNT(*) AS product_count
FROM products
WHERE status != 'archived'
GROUP BY 
    CASE 
        WHEN (github_repo_url IS NULL AND github_repo_name IS NULL) 
          OR (cloudflare_domain IS NULL AND cloudflare_worker_url IS NULL)
          OR stripe_product_id IS NULL
          OR icon_url IS NULL
        THEN 'Cannot Publish'
        ELSE 'Can Publish'
    END;

