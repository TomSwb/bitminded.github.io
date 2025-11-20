-- Migration: Seed Initial Services Data
-- Purpose: Populate services table with all BitMinded services
-- Dependencies: services table
-- Created: 2025-01-30

-- Commissioning Services
INSERT INTO services (name, slug, description, short_description, service_category, status, pricing_type, base_price_currency, pricing, price_range_min, price_range_max, duration, display_order) VALUES
(
    'Personal Project Intake',
    'personal-project-intake',
    'Quick call and questionnaire to scope personal or family projects before issuing a quote. CHF 20 is credited toward your project.',
    'Quick call and questionnaire to scope personal or family projects before issuing a quote.',
    'commissioning',
    'available',
    'fixed',
    'CHF',
    '{"CHF": {"amount": 20}}'::jsonb,
    20,
    20,
    'Quick call',
    1
),
(
    'Commission a Feature',
    'commission-a-feature',
    'Have an idea for a new feature for an existing catalog tool? Commission it and we''ll add it to the tool. Beyond simple corrections—this is for new functionality specific to the tool.',
    'Have an idea for a new feature for an existing catalog tool? Commission it and we''ll add it to the tool.',
    'commissioning',
    'available',
    'range',
    'CHF',
    '{"CHF": {"amount": 85}}'::jsonb,
    20,
    150,
    'depending on difficulty',
    2
),
(
    'Simple App',
    'simple-app',
    'Perfect for personal tools, simple automations, focused utilities. I''ll build your tool over 1-2 weeks, with regular check-ins so you can see progress.',
    'Perfect for personal tools, simple automations, focused utilities.',
    'commissioning',
    'available',
    'range',
    'CHF',
    '{"CHF": {"amount": 550}}'::jsonb,
    350,
    750,
    '1-2 weeks',
    3
),
(
    'Standard App',
    'standard-app',
    'Perfect for small business tools, multi-feature apps. I''ll build your tool over 2-4 weeks, delivering working features along the way.',
    'Perfect for small business tools, multi-feature apps.',
    'commissioning',
    'available',
    'range',
    'CHF',
    '{"CHF": {"amount": 1050}}'::jsonb,
    850,
    1250,
    '2-4 weeks',
    4
),
(
    'Complex App',
    'complex-app',
    'Perfect for multi-user systems, advanced integrations. I''ll build your tool over 6+ weeks, working closely with you to get it right.',
    'Perfect for multi-user systems, advanced integrations.',
    'commissioning',
    'available',
    'range',
    'CHF',
    '{"CHF": {"amount": 1650}}'::jsonb,
    1350,
    1950,
    '6+ weeks',
    5
);

-- Tech Support Services
INSERT INTO services (name, slug, description, short_description, service_category, status, pricing_type, base_price_currency, pricing, has_reduced_fare, reduced_fare_eligibility, duration, additional_costs, display_order) VALUES
(
    'Confidence Session',
    'confidence-session',
    'One hour of patient, judgment-free help with take-home notes—ideal for seniors and beginners building confidence.',
    'One hour of patient, judgment-free help with take-home notes—ideal for seniors and beginners building confidence.',
    'tech-support',
    'available',
    'fixed',
    'CHF',
    '{"CHF": {"amount": 50, "reduced_amount": 35}}'::jsonb,
    true,
    'Seniors, students, unemployed',
    '1 hour',
    '+ travel',
    1
),
(
    'Guided Learning Bundle',
    'guided-learning-bundle',
    'Three focused sessions to master a specific goal (e.g., Excel, Word, smartphone basics), with guided steps and light homework.',
    'Three focused sessions to master a specific goal (e.g., Excel, Word, smartphone basics), with guided steps and light homework.',
    'tech-support',
    'available',
    'fixed',
    'CHF',
    '{"CHF": {"amount": 135, "reduced_amount": 95}}'::jsonb,
    true,
    'Seniors, students, unemployed',
    '3 sessions',
    '+ travel',
    2
),
(
    'Parent & Home Tech Session',
    'parent-home-tech-session',
    '90-minute parent-focused session to understand children''s tech interests, set healthy boundaries, and configure home devices together.',
    '90-minute parent-focused session to understand children''s tech interests, set healthy boundaries, and configure home devices together.',
    'tech-support',
    'available',
    'fixed',
    'CHF',
    '{"CHF": {"amount": 75, "reduced_amount": 50}}'::jsonb,
    true,
    'Seniors, students, unemployed',
    '90 minutes',
    '+ travel',
    3
),
(
    'Quick Tech Help',
    'quick-tech-help',
    '45-minute troubleshooting or setup with annotated recap. Perfect for immediate fixes or understanding how apps and services work.',
    '45-minute troubleshooting or setup with annotated recap. Perfect for immediate fixes or understanding how apps and services work.',
    'tech-support',
    'available',
    'fixed',
    'CHF',
    '{"CHF": {"amount": 30, "reduced_amount": 25}}'::jsonb,
    true,
    'Seniors, students, unemployed',
    '45 minutes',
    NULL,
    4
),
(
    'Friendly Tech Drop-In',
    'friendly-tech-drop-in',
    '30-minute remote or café meet-up for quick fixes or app walkthroughs. Great for simple questions and rapid support.',
    '30-minute remote or café meet-up for quick fixes or app walkthroughs. Great for simple questions and rapid support.',
    'tech-support',
    'available',
    'fixed',
    'CHF',
    '{"CHF": {"amount": 35, "reduced_amount": 30}}'::jsonb,
    true,
    'Seniors, students, unemployed',
    '1 hour',
    '+ travel + coffee 😉',
    5
),
(
    'Home Visit Essentials',
    'home-visit-essentials',
    'Hands-on setup for smart home devices, video game consoles, and more, with a tailored checklist and follow-up notes.',
    'Hands-on setup for smart home devices, video game consoles, and more, with a tailored checklist and follow-up notes.',
    'tech-support',
    'available',
    'fixed',
    'CHF',
    '{"CHF": {"amount": 90, "reduced_amount": 65}}'::jsonb,
    true,
    'Seniors, students, unemployed',
    '90 minutes',
    '+ travel',
    6
),
(
    'Device Procurement',
    'device-procurement',
    'We source new or second-hand devices to your needs, then handle setup and personalization. Device cost appears on the invoice.',
    'We source new or second-hand devices to your needs, then handle setup and personalization. Device cost appears on the invoice.',
    'tech-support',
    'available',
    'hourly',
    'CHF',
    '{"CHF": {"amount": 30, "reduced_amount": 20}}'::jsonb,
    true,
    'Seniors, students, unemployed',
    'Variable',
    '+ device cost + travel',
    7
);

-- Catalog Access Services
INSERT INTO services (name, slug, description, short_description, service_category, status, pricing_type, base_price_currency, pricing, price_range_min, price_range_max, duration, display_order) VALUES
(
    'Single Tool License',
    'single-tool-license',
    'Lifetime access to one finished artisanal app with updates. Pricing and payment model (one-time or subscription) vary by tool based on complexity and features.',
    'Lifetime access to one finished artisanal app with updates.',
    'catalog-access',
    'available',
    'range',
    'CHF',
    '{"CHF": {"amount": 13.5}}'::jsonb,
    2,
    25,
    'varies by tool',
    1
),
(
    'All-Tools Membership',
    'all-tools-membership',
    'Unlock every catalog app and private release notes. Price may increase over time as the catalog grows. New pricing will always be communicated prior to implementation.',
    'Unlock every catalog app and private release notes.',
    'catalog-access',
    'available',
    'fixed',
    'CHF',
    '{"CHF": {"amount": 5, "monthly": 5, "yearly": 55, "family_monthly": 3.50, "family_yearly": 38.50}}'::jsonb,
    5,
    5,
    '/month',
    2
),
(
    'Supporter Tier',
    'supporter-tier',
    'All-Tools perks plus the ability to propose your own features. Price may increase over time as the catalog grows. New pricing will always be communicated prior to implementation.',
    'All-Tools perks plus the ability to propose your own features.',
    'catalog-access',
    'available',
    'fixed',
    'CHF',
    '{"CHF": {"amount": 8, "monthly": 8, "yearly": 88, "family_monthly": 5, "family_yearly": 55}}'::jsonb,
    8,
    8,
    '/month',
    3
);

-- Set published_at for all services
UPDATE services SET published_at = NOW() WHERE published_at IS NULL;

