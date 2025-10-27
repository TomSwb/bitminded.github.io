-- AI Recommendations table to store and learn from user preferences
CREATE TABLE ai_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    recommended_value TEXT NOT NULL,
    reasoning TEXT NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
    user_accepted BOOLEAN DEFAULT NULL, -- NULL = not decided, TRUE = accepted, FALSE = rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX idx_ai_recommendations_product_id ON ai_recommendations(product_id);
CREATE INDEX idx_ai_recommendations_field_name ON ai_recommendations(field_name);

-- RLS Policies
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recommendations
CREATE POLICY "Users can view their own recommendations" ON ai_recommendations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own recommendations
CREATE POLICY "Users can insert their own recommendations" ON ai_recommendations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own recommendations
CREATE POLICY "Users can update their own recommendations" ON ai_recommendations
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can manage all recommendations
CREATE POLICY "Admins can manage all recommendations" ON ai_recommendations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );
