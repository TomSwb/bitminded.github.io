-- Add GitHub repository status to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS github_repo_created BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN products.github_repo_created IS 'Whether the GitHub repository has been created';

