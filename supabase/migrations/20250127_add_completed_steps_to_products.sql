-- Migration: Add completed_steps to products
-- Purpose: Track which wizard steps have been completed for progress tracking in product management
-- Created: 2025-01-27

-- Add completed_steps column (array of integers for step numbers)
ALTER TABLE products ADD COLUMN IF NOT EXISTS completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_products_completed_steps ON products USING GIN (completed_steps);

