-- Migration: Add Sale Emoji Fields to Services Table
-- Purpose: Allow custom emoji selection for sale descriptions
-- Dependencies: services table
-- Created: 2025-01-31

-- Add emoji fields for sale description
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS sale_emoji_left VARCHAR(10) DEFAULT '✨';

ALTER TABLE services 
ADD COLUMN IF NOT EXISTS sale_emoji_right VARCHAR(10) DEFAULT '✨';

-- Add comments
COMMENT ON COLUMN services.sale_emoji_left IS 'Emoji to display on the left side of sale description';
COMMENT ON COLUMN services.sale_emoji_right IS 'Emoji to display on the right side of sale description';

