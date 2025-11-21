-- Test Data: Complete Product Test Data
-- Purpose: Insert comprehensive test products for testing sale management, catalog display, and publish functionality
-- Usage: Run this in your dev database to populate test products
-- Created: 2025-02-02
--
-- ⚠️  IMPORTANT: Stripe Products
-- The Stripe IDs in this script (e.g., 'prod_test_*', 'price_test_*') are FAKE/TEST IDs.
-- They will NOT create actual products in your Stripe account.
-- These are just placeholder IDs for testing the database structure and UI.
--
-- To create REAL Stripe products:
-- 1. Use the Product Wizard (admin panel) - it will create products via edge functions
-- 2. Use the Product Management UI - click "Create Stripe Product" button
-- 3. The edge functions (create-stripe-product, create-stripe-subscription-product) will
--    create actual products in Stripe and return real Stripe IDs
--
-- This test data is useful for:
-- - Testing the product management UI
-- - Testing sale management functionality
-- - Testing catalog display
-- - Testing publish/unpublish workflows
-- - Testing without creating real Stripe products

-- First, get a category ID (assuming at least one category exists)
-- If no categories exist, the default categories should be created by the migration
DO $$
DECLARE
    test_category_id UUID;
    test_category_dev_id UUID;
    test_category_business_id UUID;
    test_category_util_id UUID;
BEGIN
    -- Get or create test categories
    SELECT id INTO test_category_dev_id FROM product_categories WHERE slug = 'developer' LIMIT 1;
    SELECT id INTO test_category_business_id FROM product_categories WHERE slug = 'business' LIMIT 1;
    SELECT id INTO test_category_util_id FROM product_categories WHERE slug = 'utilities' LIMIT 1;
    
    -- If no categories exist, use the first available one or create a default
    IF test_category_dev_id IS NULL THEN
        SELECT id INTO test_category_dev_id FROM product_categories LIMIT 1;
    END IF;
    
    -- Use dev category as default if others don't exist
    IF test_category_business_id IS NULL THEN
        test_category_business_id := test_category_dev_id;
    END IF;
    IF test_category_util_id IS NULL THEN
        test_category_util_id := test_category_dev_id;
    END IF;

    -- ============================================================================
    -- PRODUCT 1: One-Time Payment Product (Active, No Sale)
    -- ============================================================================
    INSERT INTO products (
        name,
        slug,
        description,
        short_description,
        category_id,
        tags,
        status,
        pricing_type,
        price_amount,
        price_currency,
        stripe_product_id,
        stripe_price_id,
        stripe_price_chf_id,
        stripe_price_usd_id,
        stripe_price_eur_id,
        stripe_price_gbp_id,
        trial_days,
        trial_requires_payment,
        icon_url,
        screenshots,
        features,
        target_audience,
        tech_stack,
        is_featured,
        is_available_for_purchase,
        published_at,
        created_at,
        updated_at
    ) VALUES (
        'Test TaskMaster Pro',
        'test-taskmaster-pro',
        'A comprehensive task management tool designed for teams and individuals. Organize your projects, track progress, and collaborate seamlessly. Features include kanban boards, time tracking, team collaboration, and advanced reporting.',
        'Professional task management and project tracking tool',
        test_category_business_id,
        ARRAY['productivity', 'project-management', 'collaboration'],
        'active',
        'one_time',
        99.00,
        'USD',
        'prod_test_taskmaster',
        'price_test_taskmaster_chf',
        'price_test_taskmaster_chf',
        'price_test_taskmaster_usd',
        'price_test_taskmaster_eur',
        'price_test_taskmaster_gbp',
        0,
        false,
        'https://via.placeholder.com/64',
        ARRAY['https://via.placeholder.com/800x600', 'https://via.placeholder.com/800x600'],
        ARRAY[
            'Kanban boards with drag-and-drop',
            'Real-time team collaboration',
            'Time tracking and reporting',
            'Custom workflows and automation',
            'Mobile apps for iOS and Android',
            'Integrations with 50+ tools'
        ],
        'Teams and professionals managing complex projects',
        ARRAY['React', 'Node.js', 'PostgreSQL', 'Redis'],
        true,
        true,
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '1 day'
    );

    -- ============================================================================
    -- PRODUCT 2: Subscription Product (Published, With Active Sale)
    -- ============================================================================
    INSERT INTO products (
        name,
        slug,
        description,
        short_description,
        category_id,
        tags,
        status,
        pricing_type,
        price_amount,
        price_currency,
        subscription_interval,
        stripe_product_id,
        stripe_price_id,
        stripe_price_monthly_id,
        stripe_price_yearly_id,
        stripe_price_chf_id,
        stripe_price_usd_id,
        stripe_price_eur_id,
        stripe_price_gbp_id,
        stripe_price_monthly_sale_id,
        stripe_price_yearly_sale_id,
        trial_days,
        trial_requires_payment,
        icon_url,
        screenshots,
        features,
        target_audience,
        tech_stack,
        is_featured,
        is_available_for_purchase,
        is_on_sale,
        sale_start_date,
        sale_end_date,
        sale_discount_percentage,
        sale_description,
        sale_emoji_left,
        sale_emoji_right,
        sale_pricing,
        published_at,
        created_at,
        updated_at
    ) VALUES (
        'Test CodeSync Premium',
        'test-codesync-premium',
        'Advanced code synchronization and version control tool for development teams. Keep your codebase in sync across multiple environments, automate deployments, and streamline your development workflow.',
        'Advanced code synchronization for development teams',
        test_category_dev_id,
        ARRAY['developer-tools', 'version-control', 'devops'],
        'active',
        'subscription',
        29.00,
        'USD',
        'monthly',
        'prod_test_codesync',
        'price_test_codesync_monthly',
        'price_test_codesync_monthly',
        'price_test_codesync_yearly',
        'price_test_codesync_chf',
        'price_test_codesync_usd',
        'price_test_codesync_eur',
        'price_test_codesync_gbp',
        'price_test_codesync_monthly_sale',
        'price_test_codesync_yearly_sale',
        14,
        true,
        'https://via.placeholder.com/64',
        ARRAY['https://via.placeholder.com/800x600'],
        ARRAY[
            'Multi-environment synchronization',
            'Automated deployment pipelines',
            'Conflict resolution tools',
            'Team collaboration features',
            'Advanced branching strategies',
            'Integration with Git, SVN, and Mercurial'
        ],
        'Development teams and DevOps professionals',
        ARRAY['Python', 'Docker', 'Kubernetes', 'Terraform'],
        true,
        true,
        true,
        NOW() - INTERVAL '5 days',
        NOW() + INTERVAL '25 days',
        25.00,
        'Limited Time: 25% Off Annual Plans',
        '🎉',
        '🎉',
        '{"CHF": {"monthly": 22.50, "yearly": 216.00}, "USD": {"monthly": 21.75, "yearly": 208.80}, "EUR": {"monthly": 20.25, "yearly": 194.40}, "GBP": {"monthly": 18.75, "yearly": 180.00}}'::jsonb,
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '1 day'
    );

    -- ============================================================================
    -- PRODUCT 3: Freemium Product (Published, No Sale)
    -- ============================================================================
    INSERT INTO products (
        name,
        slug,
        description,
        short_description,
        category_id,
        tags,
        status,
        pricing_type,
        price_amount,
        price_currency,
        stripe_product_id,
        trial_days,
        trial_requires_payment,
        icon_url,
        screenshots,
        features,
        target_audience,
        tech_stack,
        is_featured,
        is_available_for_purchase,
        published_at,
        created_at,
        updated_at
    ) VALUES (
        'Test NotePad Free',
        'test-notepad-free',
        'A simple and elegant note-taking application. Free for personal use with all essential features. Perfect for students, writers, and anyone who needs a clean writing environment.',
        'Free note-taking app for everyone',
        test_category_util_id,
        ARRAY['productivity', 'writing', 'notes'],
        'active',
        'freemium',
        0.00,
        'USD',
        'prod_test_notepad',
        0,
        false,
        'https://via.placeholder.com/64',
        ARRAY['https://via.placeholder.com/800x600'],
        ARRAY[
            'Clean, distraction-free interface',
            'Markdown support',
            'Cloud sync across devices',
            'Search and organization',
            'Export to PDF, DOCX, and HTML',
            'Offline mode'
        ],
        'Students, writers, and note-takers',
        ARRAY['Vue.js', 'Firebase', 'PWA'],
        false,
        true,
        NOW() - INTERVAL '90 days',
        NOW() - INTERVAL '90 days',
        NOW() - INTERVAL '2 days'
    );

    -- ============================================================================
    -- PRODUCT 4: Subscription Product (Draft, No Sale) - For Testing Publish
    -- ============================================================================
    INSERT INTO products (
        name,
        slug,
        description,
        short_description,
        category_id,
        tags,
        status,
        pricing_type,
        price_amount,
        price_currency,
        subscription_interval,
        stripe_product_id,
        stripe_price_monthly_id,
        stripe_price_yearly_id,
        trial_days,
        trial_requires_payment,
        icon_url,
        screenshots,
        features,
        target_audience,
        tech_stack,
        is_featured,
        is_available_for_purchase,
        created_at,
        updated_at
    ) VALUES (
        'Test DataViz Studio',
        'test-dataviz-studio',
        'Create stunning data visualizations and interactive dashboards. Transform your data into compelling stories with our intuitive drag-and-drop interface. Perfect for analysts, marketers, and business intelligence teams.',
        'Interactive data visualization and dashboard tool',
        test_category_business_id,
        ARRAY['analytics', 'data-visualization', 'business-intelligence'],
        'draft',
        'subscription',
        49.00,
        'USD',
        'monthly',
        'prod_test_dataviz',
        'price_test_dataviz_monthly',
        'price_test_dataviz_yearly',
        7,
        false,
        'https://via.placeholder.com/64',
        ARRAY['https://via.placeholder.com/800x600', 'https://via.placeholder.com/800x600'],
        ARRAY[
            'Drag-and-drop chart builder',
            'Real-time data connections',
            'Interactive dashboards',
            'Export to PDF and PNG',
            'Collaborative editing',
            '50+ chart types',
            'Custom color themes'
        ],
        'Data analysts, marketers, and BI professionals',
        ARRAY['D3.js', 'React', 'Python', 'PostgreSQL'],
        false,
        true,
        NOW() - INTERVAL '7 days',
        NOW() - INTERVAL '1 hour'
    );

    -- ============================================================================
    -- PRODUCT 5: One-Time Product (Active, With Expired Sale)
    -- ============================================================================
    INSERT INTO products (
        name,
        slug,
        description,
        short_description,
        category_id,
        tags,
        status,
        pricing_type,
        price_amount,
        price_currency,
        stripe_product_id,
        stripe_price_id,
        stripe_price_sale_id,
        trial_days,
        trial_requires_payment,
        icon_url,
        screenshots,
        features,
        target_audience,
        tech_stack,
        is_featured,
        is_available_for_purchase,
        is_on_sale,
        sale_start_date,
        sale_end_date,
        sale_discount_percentage,
        sale_description,
        sale_emoji_left,
        sale_emoji_right,
        published_at,
        created_at,
        updated_at
    ) VALUES (
        'Test PDF Converter Pro',
        'test-pdf-converter-pro',
        'Professional PDF conversion tool. Convert PDFs to Word, Excel, PowerPoint, and more. Batch processing, OCR support, and advanced editing capabilities.',
        'Professional PDF conversion and editing tool',
        test_category_util_id,
        ARRAY['utilities', 'pdf', 'conversion'],
        'active',
        'one_time',
        79.00,
        'USD',
        'prod_test_pdfconverter',
        'price_test_pdfconverter',
        'price_test_pdfconverter_sale',
        0,
        false,
        'https://via.placeholder.com/64',
        ARRAY['https://via.placeholder.com/800x600'],
        ARRAY[
            'Convert PDF to 20+ formats',
            'Batch processing',
            'OCR text recognition',
            'PDF editing and merging',
            'Password protection',
            'Watermark support'
        ],
        'Professionals working with documents',
        ARRAY['Python', 'PDF.js', 'Tesseract OCR'],
        false,
        true,
        false,
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '30 days',
        30.00,
        'Holiday Sale: 30% Off',
        '🎄',
        '🎄',
        NOW() - INTERVAL '120 days',
        NOW() - INTERVAL '120 days',
        NOW() - INTERVAL '30 days'
    );

    -- ============================================================================
    -- PRODUCT 6: Subscription Product (Active, With Upcoming Sale)
    -- ============================================================================
    INSERT INTO products (
        name,
        slug,
        description,
        short_description,
        category_id,
        tags,
        status,
        pricing_type,
        price_amount,
        price_currency,
        subscription_interval,
        stripe_product_id,
        stripe_price_monthly_id,
        stripe_price_yearly_id,
        trial_days,
        trial_requires_payment,
        icon_url,
        screenshots,
        features,
        target_audience,
        tech_stack,
        is_featured,
        is_available_for_purchase,
        is_on_sale,
        sale_start_date,
        sale_end_date,
        sale_discount_percentage,
        sale_description,
        sale_emoji_left,
        sale_emoji_right,
        published_at,
        created_at,
        updated_at
    ) VALUES (
        'Test CloudBackup Plus',
        'test-cloudbackup-plus',
        'Secure cloud backup solution with automatic synchronization. Protect your files with enterprise-grade encryption and unlimited storage. Perfect for businesses and power users.',
        'Secure cloud backup with unlimited storage',
        test_category_business_id,
        ARRAY['backup', 'cloud-storage', 'security'],
        'active',
        'subscription',
        19.00,
        'USD',
        'monthly',
        'prod_test_cloudbackup',
        'price_test_cloudbackup_monthly',
        'price_test_cloudbackup_yearly',
        30,
        false,
        'https://via.placeholder.com/64',
        ARRAY['https://via.placeholder.com/800x600'],
        ARRAY[
            'Unlimited cloud storage',
            'Automatic backup scheduling',
            'End-to-end encryption',
            'Version history',
            'Multi-device sync',
            'File sharing and collaboration'
        ],
        'Businesses and power users',
        ARRAY['Go', 'AWS S3', 'Encryption'],
        false,
        true,
        false,
        NOW() + INTERVAL '3 days',
        NOW() + INTERVAL '33 days',
        40.00,
        'Spring Sale: 40% Off - Starting Soon!',
        '🌸',
        '🌸',
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '45 days',
        NOW() - INTERVAL '1 day'
    );

    -- ============================================================================
    -- PRODUCT 7: One-Time Product (Beta Status, No Sale)
    -- ============================================================================
    INSERT INTO products (
        name,
        slug,
        description,
        short_description,
        category_id,
        tags,
        status,
        pricing_type,
        price_amount,
        price_currency,
        stripe_product_id,
        stripe_price_id,
        trial_days,
        trial_requires_payment,
        icon_url,
        screenshots,
        features,
        target_audience,
        tech_stack,
        is_featured,
        is_available_for_purchase,
        published_at,
        created_at,
        updated_at
    ) VALUES (
        'Test AI Writer Assistant',
        'test-ai-writer-assistant',
        'AI-powered writing assistant that helps you create better content. Grammar checking, style suggestions, and content generation powered by advanced language models.',
        'AI-powered writing and content generation tool',
        test_category_util_id,
        ARRAY['ai', 'writing', 'productivity'],
        'beta',
        'one_time',
        149.00,
        'USD',
        'prod_test_aiwriter',
        'price_test_aiwriter',
        0,
        false,
        'https://via.placeholder.com/64',
        ARRAY['https://via.placeholder.com/800x600'],
        ARRAY[
            'Grammar and style checking',
            'Content generation',
            'Multiple language support',
            'Tone adjustment',
            'Plagiarism detection',
            'Integration with popular editors'
        ],
        'Writers, content creators, and students',
        ARRAY['OpenAI API', 'React', 'Node.js'],
        false,
        true,
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '1 day'
    );

    -- ============================================================================
    -- PRODUCT 8: Subscription Product (Coming Soon, No Sale)
    -- ============================================================================
    INSERT INTO products (
        name,
        slug,
        description,
        short_description,
        category_id,
        tags,
        status,
        pricing_type,
        price_amount,
        price_currency,
        subscription_interval,
        trial_days,
        trial_requires_payment,
        icon_url,
        screenshots,
        features,
        target_audience,
        tech_stack,
        is_featured,
        is_available_for_purchase,
        created_at,
        updated_at
    ) VALUES (
        'Test VideoEdit Pro',
        'test-videoedit-pro',
        'Professional video editing software in the cloud. Edit videos from anywhere with our browser-based editor. No downloads required, works on any device.',
        'Cloud-based professional video editing',
        test_category_util_id,
        ARRAY['video-editing', 'creative', 'cloud'],
        'coming-soon',
        'subscription',
        39.00,
        'USD',
        'monthly',
        14,
        true,
        'https://via.placeholder.com/64',
        ARRAY['https://via.placeholder.com/800x600'],
        ARRAY[
            'Browser-based editing',
            '4K video support',
            'Advanced effects and transitions',
            'Audio mixing',
            'Collaborative editing',
            'Cloud rendering'
        ],
        'Video creators and editors',
        ARRAY['WebAssembly', 'FFmpeg', 'WebGL'],
        false,
        false,
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '1 day'
    );

    RAISE NOTICE '✅ Test products inserted successfully!';
    RAISE NOTICE '📊 Summary:';
    RAISE NOTICE '   - 3 Active products (1 with active sale, 1 with expired sale, 1 with upcoming sale)';
    RAISE NOTICE '   - 1 Draft product (for testing publish)';
    RAISE NOTICE '   - 1 Beta product';
    RAISE NOTICE '   - 1 Coming Soon product';
    RAISE NOTICE '   - 1 Freemium product';
    RAISE NOTICE '';
    RAISE NOTICE '🧪 Test Scenarios:';
    RAISE NOTICE '   - Sale Management: Test with Test CodeSync Premium (active sale)';
    RAISE NOTICE '   - Publish Function: Test with Test DataViz Studio (draft)';
    RAISE NOTICE '   - Catalog Display: Check all active/published products';
    RAISE NOTICE '   - Sale Badges: Should appear on Test CodeSync Premium only';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Stripe Products';
    RAISE NOTICE '   The Stripe IDs in this script are FAKE/TEST IDs (e.g., prod_test_*)';
    RAISE NOTICE '   They will NOT create actual products in Stripe.';
    RAISE NOTICE '   To create real Stripe products, use the Product Wizard or Product Management UI,';
    RAISE NOTICE '   which will call the edge functions to create actual Stripe products.';

END $$;

