-- Migration: Create Product Reviews Table
-- Purpose: User reviews and ratings for products
-- Dependencies: products table, user_profiles table
-- Created: 2025-01-15

-- Create product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, hidden
    
    -- Admin Management
    admin_notes TEXT,
    moderated_by UUID REFERENCES user_profiles(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_is_featured ON product_reviews(is_featured);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at);

-- Add updated_at trigger
CREATE TRIGGER update_product_reviews_updated_at 
    BEFORE UPDATE ON product_reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view approved reviews
CREATE POLICY "Users can view approved reviews" ON product_reviews
    FOR SELECT USING (status = 'approved');

-- Users can create reviews for products they own
CREATE POLICY "Users can create reviews for owned products" ON product_reviews
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM product_purchases 
            WHERE user_id = auth.uid() 
            AND product_id = product_reviews.product_id 
            AND status = 'active'
        )
    );

-- Users can edit their own pending reviews
CREATE POLICY "Users can edit own pending reviews" ON product_reviews
    FOR UPDATE USING (
        user_id = auth.uid() AND 
        status = 'pending'
    );

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews" ON product_reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Add constraints
ALTER TABLE product_reviews ADD CONSTRAINT check_status 
    CHECK (status IN ('pending', 'approved', 'rejected', 'hidden'));

-- Add unique constraint to prevent duplicate reviews
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_product_review 
    ON product_reviews(user_id, product_id);

-- Add comments
COMMENT ON TABLE product_reviews IS 'User reviews and ratings for products';
COMMENT ON COLUMN product_reviews.rating IS 'Rating from 1 to 5 stars';
COMMENT ON COLUMN product_reviews.comment IS 'Review text content';
COMMENT ON COLUMN product_reviews.is_verified_purchase IS 'Whether reviewer actually purchased the product';
COMMENT ON COLUMN product_reviews.is_featured IS 'Whether to show this review prominently';
COMMENT ON COLUMN product_reviews.status IS 'Review moderation status: pending, approved, rejected, hidden';
COMMENT ON COLUMN product_reviews.admin_notes IS 'Internal admin notes about this review';
COMMENT ON COLUMN product_reviews.moderated_by IS 'Admin user who moderated this review';
COMMENT ON COLUMN product_reviews.moderated_at IS 'When this review was moderated';
