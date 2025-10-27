-- Add technical_specification column to products table
-- This column will store AI-generated technical specifications

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS technical_specification TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN products.technical_specification IS 'AI-generated technical specification in markdown format';
