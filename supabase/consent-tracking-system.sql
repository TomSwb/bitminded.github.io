-- BitMinded Consent Tracking System
-- Execute this in Supabase SQL Editor

-- 1. Create User Consents Table
CREATE TABLE public.user_consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL, -- 'terms', 'privacy', 'marketing', 'analytics'
    version TEXT NOT NULL, -- '1.0', '1.1', etc.
    accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    UNIQUE(user_id, consent_type, version)
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can only see their own consents
CREATE POLICY "Users can view own consents" ON public.user_consents
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own consents
CREATE POLICY "Users can insert own consents" ON public.user_consents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all consents (for compliance reporting)
CREATE POLICY "Admins can view all consents" ON public.user_consents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Create Indexes for Performance
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_type ON public.user_consents(consent_type);
CREATE INDEX idx_user_consents_accepted_at ON public.user_consents(accepted_at);

-- 3. Update User Profile Creation Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.user_profiles (id, username)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
    
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    -- Create default preferences
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    -- Note: Consent records will be created by the frontend after user accepts terms/privacy
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Consent Management Functions

-- Function to check if user has accepted specific consent
CREATE OR REPLACE FUNCTION public.has_consent(
    user_uuid UUID DEFAULT auth.uid(),
    consent_type_param TEXT,
    version_param TEXT DEFAULT '1.0'
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_consents 
        WHERE user_id = user_uuid 
        AND consent_type = consent_type_param 
        AND version = version_param
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's consent history
CREATE OR REPLACE FUNCTION public.get_user_consents(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    consent_type TEXT,
    version TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    ip_address INET
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.consent_type,
        uc.version,
        uc.accepted_at,
        uc.ip_address
    FROM public.user_consents uc
    WHERE uc.user_id = user_uuid
    ORDER BY uc.accepted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record consent (called by frontend)
CREATE OR REPLACE FUNCTION public.record_consent(
    user_uuid UUID DEFAULT auth.uid(),
    consent_type_param TEXT,
    version_param TEXT DEFAULT '1.0',
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Insert consent record
    INSERT INTO public.user_consents (
        user_id, 
        consent_type, 
        version, 
        ip_address, 
        user_agent
    ) VALUES (
        user_uuid,
        consent_type_param,
        version_param,
        ip_address_param,
        user_agent_param
    )
    ON CONFLICT (user_id, consent_type, version) 
    DO UPDATE SET 
        accepted_at = NOW(),
        ip_address = ip_address_param,
        user_agent = user_agent_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create Consent Validation Function for Signup
CREATE OR REPLACE FUNCTION public.validate_signup_consents(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has accepted required consents
    RETURN (
        public.has_consent(user_uuid, 'terms', '1.0') AND
        public.has_consent(user_uuid, 'privacy', '1.0')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create Admin Function for Consent Reporting
CREATE OR REPLACE FUNCTION public.get_consent_report(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    consent_type TEXT,
    version TEXT,
    total_acceptances BIGINT,
    unique_users BIGINT,
    first_acceptance TIMESTAMP WITH TIME ZONE,
    last_acceptance TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Only admins can access this function
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY
    SELECT 
        uc.consent_type,
        uc.version,
        COUNT(*) as total_acceptances,
        COUNT(DISTINCT uc.user_id) as unique_users,
        MIN(uc.accepted_at) as first_acceptance,
        MAX(uc.accepted_at) as last_acceptance
    FROM public.user_consents uc
    WHERE 
        (start_date IS NULL OR uc.accepted_at >= start_date) AND
        (end_date IS NULL OR uc.accepted_at <= end_date)
    GROUP BY uc.consent_type, uc.version
    ORDER BY uc.consent_type, uc.version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create GDPR Compliance Functions

-- Function to get all user data for GDPR export
CREATE OR REPLACE FUNCTION public.export_user_data(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Only allow users to export their own data
    IF user_uuid != auth.uid() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Can only export own data';
    END IF;
    
    SELECT json_build_object(
        'user_profile', (
            SELECT row_to_json(up) 
            FROM public.user_profiles up 
            WHERE up.id = user_uuid
        ),
        'user_preferences', (
            SELECT row_to_json(prefs) 
            FROM public.user_preferences prefs 
            WHERE prefs.user_id = user_uuid
        ),
        'consents', (
            SELECT json_agg(row_to_json(uc)) 
            FROM public.user_consents uc 
            WHERE uc.user_id = user_uuid
        ),
        'login_activity', (
            SELECT json_agg(row_to_json(la)) 
            FROM public.login_activity la 
            WHERE la.user_id = user_uuid
        ),
        'subscriptions', (
            SELECT json_agg(row_to_json(us)) 
            FROM public.user_subscriptions us 
            WHERE us.user_id = user_uuid
        ),
        'entitlements', (
            SELECT json_agg(row_to_json(e)) 
            FROM public.entitlements e 
            WHERE e.user_id = user_uuid
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete user data for GDPR right to be forgotten
CREATE OR REPLACE FUNCTION public.delete_user_data(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only allow users to delete their own data or admins
    IF user_uuid != auth.uid() AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied: Can only delete own data';
    END IF;
    
    -- Delete user data (cascading deletes will handle related records)
    DELETE FROM auth.users WHERE id = user_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create Consent Version Management

-- Table to track consent versions
CREATE TABLE public.consent_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consent_type TEXT NOT NULL,
    version TEXT NOT NULL,
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(consent_type, version)
);

-- Insert initial consent versions
INSERT INTO public.consent_versions (consent_type, version, description) VALUES
('terms', '1.0', 'Initial Terms of Service'),
('privacy', '1.0', 'Initial Privacy Policy'),
('marketing', '1.0', 'Marketing Communications Consent'),
('analytics', '1.0', 'Analytics and Cookies Consent');

-- Enable RLS for consent versions
ALTER TABLE public.consent_versions ENABLE ROW LEVEL SECURITY;

-- Everyone can read consent versions (public information)
CREATE POLICY "Anyone can view consent versions" ON public.consent_versions
    FOR SELECT USING (true);

-- Only admins can manage consent versions
CREATE POLICY "Admins can manage consent versions" ON public.consent_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 9. Create Audit Log for Consent Changes
CREATE TABLE public.consent_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'accepted', 'withdrawn', 'updated'
    consent_type TEXT NOT NULL,
    version TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for audit log
ALTER TABLE public.consent_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit log
CREATE POLICY "Users can view own consent audit log" ON public.consent_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all consent audit logs" ON public.consent_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 10. Create Trigger to Log Consent Changes
CREATE OR REPLACE FUNCTION public.log_consent_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.consent_audit_log (
            user_id, action, consent_type, version, ip_address, user_agent
        ) VALUES (
            NEW.user_id, 'accepted', NEW.consent_type, NEW.version, NEW.ip_address, NEW.user_agent
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.consent_audit_log (
            user_id, action, consent_type, version, ip_address, user_agent
        ) VALUES (
            NEW.user_id, 'updated', NEW.consent_type, NEW.version, NEW.ip_address, NEW.user_agent
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER consent_audit_trigger
    AFTER INSERT OR UPDATE ON public.user_consents
    FOR EACH ROW EXECUTE FUNCTION public.log_consent_changes();

-- 11. Create Indexes for Performance
CREATE INDEX idx_consent_versions_type ON public.consent_versions(consent_type);
CREATE INDEX idx_consent_audit_log_user_id ON public.consent_audit_log(user_id);
CREATE INDEX idx_consent_audit_log_created_at ON public.consent_audit_log(created_at);

-- 12. Grant Permissions
-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.has_consent(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_consents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_consent(UUID, TEXT, TEXT, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_signup_consents(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO authenticated;

-- Grant execute permissions on admin functions to authenticated users
-- (Admin check is handled within the functions)
GRANT EXECUTE ON FUNCTION public.get_consent_report(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- 13. Create Sample Data for Testing (Optional)
-- Uncomment the following lines to create sample consent data for testing
/*
-- Sample consent data for testing
INSERT INTO public.user_consents (user_id, consent_type, version, ip_address, user_agent) VALUES
('00000000-0000-0000-0000-000000000000', 'terms', '1.0', '127.0.0.1', 'Test User Agent'),
('00000000-0000-0000-0000-000000000000', 'privacy', '1.0', '127.0.0.1', 'Test User Agent');
*/

-- 14. Create Views for Easy Querying

-- View for current user consents
CREATE VIEW public.current_user_consents AS
SELECT 
    uc.consent_type,
    uc.version,
    uc.accepted_at,
    cv.description,
    cv.effective_date
FROM public.user_consents uc
JOIN public.consent_versions cv ON uc.consent_type = cv.consent_type AND uc.version = cv.version
WHERE uc.user_id = auth.uid();

-- Grant access to the view
GRANT SELECT ON public.current_user_consents TO authenticated;

-- 15. Create Compliance Check Function
CREATE OR REPLACE FUNCTION public.check_compliance_status(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    consent_type TEXT,
    has_consent BOOLEAN,
    version TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE,
    is_required BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cv.consent_type,
        CASE WHEN uc.user_id IS NOT NULL THEN TRUE ELSE FALSE END as has_consent,
        cv.version,
        uc.accepted_at,
        CASE 
            WHEN cv.consent_type IN ('terms', 'privacy') THEN TRUE 
            ELSE FALSE 
        END as is_required
    FROM public.consent_versions cv
    LEFT JOIN public.user_consents uc ON (
        uc.user_id = user_uuid AND 
        uc.consent_type = cv.consent_type AND 
        uc.version = cv.version
    )
    WHERE cv.effective_date <= NOW()
    ORDER BY cv.consent_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to compliance check function
GRANT EXECUTE ON FUNCTION public.check_compliance_status(UUID) TO authenticated;

-- 16. Final Comments and Documentation
COMMENT ON TABLE public.user_consents IS 'Stores user consent records for GDPR compliance';
COMMENT ON TABLE public.consent_versions IS 'Tracks versions of consent documents';
COMMENT ON TABLE public.consent_audit_log IS 'Audit trail for consent changes';

COMMENT ON FUNCTION public.has_consent(UUID, TEXT, TEXT) IS 'Check if user has accepted specific consent';
COMMENT ON FUNCTION public.record_consent(UUID, TEXT, TEXT, INET, TEXT) IS 'Record user consent with IP and user agent';
COMMENT ON FUNCTION public.validate_signup_consents(UUID) IS 'Validate that user has accepted required consents for signup';
COMMENT ON FUNCTION public.export_user_data(UUID) IS 'Export all user data for GDPR compliance';
COMMENT ON FUNCTION public.delete_user_data(UUID) IS 'Delete user data for GDPR right to be forgotten';

-- 17. Success Message
DO $$
BEGIN
    RAISE NOTICE 'Consent tracking system created successfully!';
    RAISE NOTICE 'Tables created: user_consents, consent_versions, consent_audit_log';
    RAISE NOTICE 'Functions created: has_consent, record_consent, validate_signup_consents, export_user_data, delete_user_data';
    RAISE NOTICE 'Views created: current_user_consents';
    RAISE NOTICE 'Ready for frontend integration!';
END $$;
