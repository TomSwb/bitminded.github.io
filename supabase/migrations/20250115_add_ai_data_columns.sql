-- Add AI recommendations and conversation data to products table
-- This will store the AI decision-making process for each product

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS ai_recommendations JSONB,
ADD COLUMN IF NOT EXISTS ai_conversations JSONB,
ADD COLUMN IF NOT EXISTS ai_final_decisions JSONB;

-- Add comments to describe the columns
COMMENT ON COLUMN products.ai_recommendations IS 'AI recommendations for technical decisions (platform, frontend, backend, etc.)';
COMMENT ON COLUMN products.ai_conversations IS 'Chat conversation history with AI for each technical field';
COMMENT ON COLUMN products.ai_final_decisions IS 'Final technical decisions made by user based on AI recommendations';

-- Add index for JSONB columns for better query performance
CREATE INDEX IF NOT EXISTS idx_products_ai_recommendations ON products USING GIN (ai_recommendations);
CREATE INDEX IF NOT EXISTS idx_products_ai_conversations ON products USING GIN (ai_conversations);
CREATE INDEX IF NOT EXISTS idx_products_ai_final_decisions ON products USING GIN (ai_final_decisions);
