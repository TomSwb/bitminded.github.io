-- Fix Security Warnings: Function Search Path Mutable
-- Execute this in Supabase SQL Editor

-- Fix 1: handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, username)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 3: has_app_access function
CREATE OR REPLACE FUNCTION public.has_app_access(
    app_name TEXT,
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.entitlements 
        WHERE user_id = user_uuid 
        AND app_id = app_name 
        AND active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    ) OR EXISTS (
        SELECT 1 FROM public.entitlements 
        WHERE user_id = user_uuid 
        AND app_id = 'all' 
        AND active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 4: is_admin_safe function
CREATE OR REPLACE FUNCTION public.is_admin_safe(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has admin role without causing recursion
    -- This function will be used by the application, not RLS policies
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 5: has_consent function
CREATE OR REPLACE FUNCTION public.has_consent(
    consent_type_param TEXT,
    version_param TEXT DEFAULT '1.0',
    user_uuid UUID DEFAULT auth.uid()
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 6: get_user_consents function
-- Drop the existing function first due to return type mismatch
DROP FUNCTION IF EXISTS public.get_user_consents(UUID);

CREATE OR REPLACE FUNCTION public.get_user_consents(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    consent_type TEXT,
    version TEXT,
    accepted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.consent_type,
        uc.version,
        uc.accepted_at
    FROM public.user_consents uc
    WHERE uc.user_id = user_uuid
    ORDER BY uc.accepted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 7: record_consent function
CREATE OR REPLACE FUNCTION public.record_consent(
    consent_type_param TEXT,
    version_param TEXT DEFAULT '1.0',
    ip_address_param INET DEFAULT NULL,
    user_agent_param TEXT DEFAULT NULL,
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Insert or update consent record
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 8: validate_signup_consents function
CREATE OR REPLACE FUNCTION public.validate_signup_consents(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user has accepted required consents
    RETURN (
        public.has_consent('terms', '1.0', user_uuid) AND
        public.has_consent('privacy', '1.0', user_uuid)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 9: get_consent_report function
-- Drop the existing function first due to return type mismatch
DROP FUNCTION IF EXISTS public.get_consent_report(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION public.get_consent_report(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    consent_type TEXT,
    version TEXT,
    total_users BIGINT,
    percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.consent_type,
        uc.version,
        COUNT(DISTINCT uc.user_id) as total_users,
        ROUND(
            (COUNT(DISTINCT uc.user_id)::NUMERIC / 
             (SELECT COUNT(*)::NUMERIC FROM auth.users)) * 100, 2
        ) as percentage
    FROM public.user_consents uc
    WHERE (start_date IS NULL OR uc.accepted_at >= start_date)
    AND (end_date IS NULL OR uc.accepted_at <= end_date)
    GROUP BY uc.consent_type, uc.version
    ORDER BY uc.consent_type, uc.version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 10: export_user_data function
CREATE OR REPLACE FUNCTION public.export_user_data(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Only allow users to export their own data or admins
    IF user_uuid != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT json_build_object(
        'user_id', user_uuid,
        'profile', (
            SELECT row_to_json(up) 
            FROM public.user_profiles up 
            WHERE up.id = user_uuid
        ),
        'preferences', (
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
        'exported_at', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 11: delete_user_data function
CREATE OR REPLACE FUNCTION public.delete_user_data(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Only allow users to delete their own data or admins
    IF user_uuid != auth.uid() AND NOT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Delete user data (cascade will handle related records)
    DELETE FROM public.user_profiles WHERE id = user_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 12: log_consent_changes function
CREATE OR REPLACE FUNCTION public.log_consent_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.consent_audit_log (
            user_id, action, consent_type, version, ip_address, user_agent
        ) VALUES (
            NEW.user_id, 'INSERT', NEW.consent_type, NEW.version, NEW.ip_address, NEW.user_agent
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.consent_audit_log (
            user_id, action, consent_type, version, ip_address, user_agent
        ) VALUES (
            NEW.user_id, 'UPDATE', NEW.consent_type, NEW.version, NEW.ip_address, NEW.user_agent
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix 13: check_compliance_status function
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
    LEFT JOIN public.user_consents uc ON cv.consent_type = uc.consent_type 
        AND cv.version = uc.version 
        AND uc.user_id = user_uuid
    WHERE cv.effective_date <= NOW()
    ORDER BY cv.consent_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
