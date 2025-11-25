# Family Plans Feature - Analysis & Planning

> **Last Updated:** January 2025  
> **Status:** 🚧 Partial Implementation - Pricing UI Complete  
> **Purpose:** Make tools/subscriptions accessible to families, simplify family management, and support "petite gens" market

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Family Plan Structure](#family-plan-structure)
3. [User Management: Family Structure](#user-management-family-structure)
4. [Profile Management: Family Profiles](#profile-management-family-profiles)
5. [Technical Requirements](#technical-requirements)
6. [Business Model Implications](#business-model-implications)
7. [Implementation Considerations](#implementation-considerations)
8. [Recommendations](#recommendations)
9. [Open Questions](#open-questions)
10. [Decision Points](#decision-points)

---

## 🎯 Overview

### Purpose

**Make tools/subscriptions easier for families to purchase and manage, while recognizing family members in the system.**

### Key Goals

1. **Accessibility:** Make subscriptions affordable for families (not just individuals)
2. **Simplicity:** Easy family management (one subscription, multiple members)
3. **Recognition:** Family members recognized in user management and profiles
4. **Value:** Strong value proposition for families (shared access, family features)
5. **Market Fit:** Align with "petite gens" market (families, households, individuals)

### Current Context

- **Individual Subscriptions:** CHF 5/month (All-Tools), CHF 8/month (Supporter)
- **Individual Yearly:** CHF 55/year (All-Tools), CHF 88/year (Supporter)
- **Family Services:** Family Tech Tune-Up (CHF 140), Family guidance sessions exist
- **Target Market:** "Petite gens" (ordinary people, families, individuals)
- **Volume Strategy:** 1000+ subscribers at CHF 5-8/month = sustainable income

---

## 💰 Family Plan Structure

### What is a "Family"?

#### Option A: Household (Same Address)
- **Definition:** People living at the same address
- **Pros:** Simple, clear definition
- **Cons:** Easy to abuse (friends, roommates), hard to verify
- **Verification:** Address verification (optional)

#### Option B: Parent-Child Relationship
- **Definition:** Parent(s) + children under 18
- **Pros:** Clear family structure, natural for guidance services
- **Cons:** Excludes households without children, needs age tracking
- **Verification:** Age verification, parent-child relationship

#### Option C: Custom Family Definition
- **Definition:** User defines who is in their family
- **Pros:** Flexible, accommodates diverse family structures
- **Cons:** Hard to moderate, potential for abuse
- **Verification:** Email verification, manual review

#### Option D: Mixed Approach (Recommended)
- **Definition:** Parent-child + optional household members
- **Structure:**
  - Parents create family account
  - Add children (under 18)
  - Optionally add household members (partner, grandparents, etc.)
  - Max 6-8 members per family
- **Pros:** Flexible, clear structure, prevents abuse
- **Cons:** More complex to implement
- **Verification:** Email verification for invitations

**Recommendation:** Option D (Mixed Approach)
- Clear family structure (parent-child)
- Flexible for diverse families
- Prevents abuse (max members, verification)
- Aligns with guidance services (family sessions)

---

### Family Plan Pricing

#### Option A: Fixed Family Price (Recommended)

**Family All-Tools Plan:**
- **Price:** CHF 15-20/month or CHF 150-200/year
- **Members:** Up to 6 family members
- **Includes:** All-Tools access for all family members
- **Value:** ~CHF 48/month (6 × CHF 8) for CHF 15-20
- **Savings:** 60-70% compared to individual subscriptions

**Family Supporter Plan:**
- **Price:** CHF 25-30/month or CHF 250-300/year
- **Members:** Up to 6 family members
- **Includes:** All-Tools + Supporter benefits for all members
- **Value:** ~CHF 60/month (6 × CHF 10) for CHF 25-30
- **Savings:** 50-60% compared to individual subscriptions

**Rationale:**
- ✅ Simple, clear pricing
- ✅ Strong value proposition
- ✅ Easier to market and explain
- ✅ Accessible to "petite gens"
- ✅ Volume strategy (more users, lower per-user revenue)

#### Option B: Per-Member Pricing (Implemented)

**Structure:**
- **All-Tools Family:** CHF 3.50 per member/month or CHF 38.50 per member/year (11 months = 1 month free)
- **Supporter Family:** CHF 5 per member/month or CHF 55 per member/year (11 months = 1 month free)
- **Flexible:** Users can choose how many members (no fixed limit, but recommended max 6-8)
- **Examples (All-Tools):**
  - 2 members: CHF 7/month or CHF 77/year
  - 3 members: CHF 10.50/month or CHF 115.50/year
  - 4 members: CHF 14/month or CHF 154/year
  - 5 members: CHF 17.50/month or CHF 192.50/year
  - 6 members: CHF 21/month or CHF 231/year
- **Examples (Supporter):**
  - 2 members: CHF 10/month or CHF 110/year
  - 3 members: CHF 15/month or CHF 165/year
  - 4 members: CHF 20/month or CHF 220/year
  - 5 members: CHF 25/month or CHF 275/year
  - 6 members: CHF 30/month or CHF 330/year

**Savings vs. Individual:**
- All-Tools: 30% savings per member (CHF 3.50 vs CHF 5/month)
- Supporter: 37.5% savings per member (CHF 5 vs CHF 8/month)
- Yearly: Additional 1 month free (11 months for price of 12)

**Rationale:**
- ✅ Scales with family size
- ✅ Fair pricing (pay for what you use)
- ✅ Flexible - no fixed member limit
- ✅ Accessible pricing that doesn't deter smaller families
- ✅ Clear per-member value proposition
- ✅ Yearly option provides additional savings

#### Option C: Tiered Family Plans

**Small Family (2-3 members):**
- **Price:** CHF 12/month or CHF 120/year
- **Value:** ~CHF 16-24/month for CHF 12

**Medium Family (4-5 members):**
- **Price:** CHF 18/month or CHF 180/year
- **Value:** ~CHF 32-40/month for CHF 18

**Large Family (6+ members):**
- **Price:** CHF 25/month or CHF 250/year
- **Value:** ~CHF 48+/month for CHF 25

**Rationale:**
- ✅ Clear tiers for different family sizes
- ✅ Accommodates diverse family structures
- ✅ Fair pricing for each tier
- ❌ More complex to implement
- ❌ Requires family size selection

**Recommendation:** Option B (Per-Member Pricing) - **IMPLEMENTED**
- **Family All-Tools:** CHF 3.50 per member/month or CHF 38.50 per member/year
- **Family Supporter:** CHF 5 per member/month or CHF 55 per member/year
- Flexible member count, accessible pricing, clear value proposition

---

### Family Plan Benefits

#### Catalog Access
- ✅ All-Tools membership for all family members
- ✅ Shared tool access (each member has their own account)
- ✅ Priority feature voting (family votes count more)
- ✅ Private release notes for all members
- ✅ New tools automatically included

#### Guidance Services
- ✅ Family guidance sessions (existing: Family Tech Tune-Up)
- ✅ Shared guidance hours (e.g., 1 hour/month for family)
- ✅ Family digital wellbeing coaching
- ✅ Family device audits and setup
- ✅ Family tech connection sessions

#### Community Features
- ✅ Family profiles (linked family members)
- ✅ Family activity tracking
- ✅ Family community features
- ✅ Family reviews and discussions
- ✅ Family member recognition

#### Commissions
- ✅ Family discounts (10-15% off commissioning)
- ✅ Family project support
- ✅ Family tool customization
- ✅ Family perpetual licenses

---

## 👥 User Management: Family Structure

### Family Groups/Households

**Database Structure:**

```sql
-- Family Groups Table
CREATE TABLE public.family_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_name TEXT NOT NULL, -- "Smith Family"
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Head of household
    family_type TEXT NOT NULL DEFAULT 'household', -- 'household', 'parent-child', 'custom'
    max_members INTEGER DEFAULT 6, -- Maximum family members
    subscription_id UUID REFERENCES public.family_subscriptions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Family Members Table
CREATE TABLE public.family_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'parent', 'guardian', 'member', 'child'
    relationship TEXT, -- 'parent', 'child', 'partner', 'grandparent', 'other'
    age INTEGER, -- For children (under 18)
    is_verified BOOLEAN DEFAULT FALSE, -- Email verification for invitation
    invited_by UUID REFERENCES auth.users(id), -- Who invited this member
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'removed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_group_id, user_id)
);

-- Family Subscriptions Table
CREATE TABLE public.family_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_name TEXT NOT NULL, -- 'family_all_tools', 'family_supporter'
    status TEXT NOT NULL, -- 'active', 'canceled', 'past_due', etc.
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Family Member Roles

#### Admin (Head of Household)
- **Permissions:**
  - Creates family account
  - Manages family subscription
  - Invites/removes members
  - Manages family settings
  - Views all family activity
  - Manages family subscription billing
- **Limitations:**
  - Cannot remove themselves (must transfer admin first)
  - Cannot exceed max members limit

#### Parent
- **Permissions:**
  - Manages children's accounts
  - Views children's activity
  - Manages family settings (limited)
  - Invites children (with admin approval)
- **Limitations:**
  - Cannot remove admin
  - Cannot manage subscription
  - Cannot remove other parents

#### Guardian
- **Permissions:**
  - Manages children's accounts (limited)
  - Views children's activity
  - Invites children (with admin approval)
- **Limitations:**
  - Cannot manage subscription
  - Cannot manage family settings
  - Cannot remove members

#### Member
- **Permissions:**
  - Full access to tools (via family subscription)
  - Views own activity
  - Participates in community
- **Limitations:**
  - Cannot manage family settings
  - Cannot invite/remove members
  - Cannot view other members' private activity

#### Child
- **Permissions:**
  - Access to tools (with parental controls)
  - Views own activity (limited)
  - Participates in community (with supervision)
- **Limitations:**
  - Limited profile visibility
  - Parental supervision required
  - Cannot manage family settings
  - Cannot invite/remove members

### Family Member Invitations

#### Invitation Flow

1. **Admin invites member:**
   - Enter email or username
   - Select role (parent, member, child, guardian)
   - Select relationship (optional)
   - Send invitation

2. **Member receives invitation:**
   - Email notification
   - Invitation link
   - Family details
   - Role and permissions

3. **Member accepts invitation:**
   - Click invitation link
   - Create account (if new user)
   - Accept invitation
   - Join family group

4. **Member gains access:**
   - Access to family subscription
   - Access to family tools
   - Access to family community
   - Family profile recognition

#### Invitation Types

**Email Invitation:**
- For new users (not yet registered)
- Email with invitation link
- Creates account during acceptance
- Email verification required

**Username Invitation:**
- For existing users (already registered)
- Username lookup
- Direct invitation to account
- Instant acceptance

**Link Invitation:**
- For family sharing
- Shareable invitation link
- Can be used by multiple people
- Expires after use or time limit

#### Invitation Management

**Admin Actions:**
- Resend invitations
- Cancel pending invitations
- Remove members
- Change member roles
- View invitation status

**Member Actions:**
- Accept invitation
- Decline invitation
- Leave family group
- Request role change

---

## 👤 Profile Management: Family Profiles

### Linked Family Profiles

#### Family Profile Page

**Features:**
- Family name and settings
- Family members list (with roles and avatars)
- Family activity (aggregated tool usage, reviews, discussions)
- Family subscription management
- Family settings and preferences
- Family community features

**Access:**
- Family members can view family profile
- Community members can view public family profile (optional)
- Admin can manage family profile

#### Individual Profiles

**Family Integration:**
- Linked to family group
- Show family membership badge
- Show family name
- Show family role
- Link to family profile

**Family Activity:**
- Show family activity (if permission granted)
- Show personal activity (private by default)
- Show family reviews and discussions
- Show family guidance sessions

**Privacy:**
- Control what family members can see
- Control what community can see
- Control what is public
- Default privacy settings

### Privacy Controls

#### Profile Visibility Levels

**Public:**
- Visible to all users
- Visible to community
- Visible to search engines
- Family membership visible

**Community:**
- Visible to community members only
- Not visible to search engines
- Family membership visible
- Activity visible to community

**Family:**
- Visible to family members only
- Not visible to community
- Family membership visible
- Activity visible to family

**Private:**
- Visible to user only
- Not visible to anyone
- Family membership hidden
- Activity hidden

#### Family Visibility

**What Family Can See:**
- Tool usage (which tools, how often)
- Reviews (tool reviews, service reviews)
- Activity (community participation, discussions)
- Guidance sessions (family sessions, individual sessions with permission)
- Commissions (family commissions, individual commissions with permission)

**What Family Cannot See:**
- Personal messages (private messages, support tickets)
- Private discussions (private forum threads)
- Payment information (billing details, payment methods)
- Security settings (2FA, password, login activity)

**Admin Visibility:**
- All family activity (for management)
- All family subscriptions (for billing)
- All family settings (for management)
- All family members (for management)

**Parent Visibility:**
- Children's activity (for supervision)
- Children's tool usage (for monitoring)
- Children's reviews (for guidance)
- Children's community participation (for safety)

### Family Settings

#### Family Preferences

**Family-Wide Settings:**
- Family language (default for all members)
- Family theme (default for all members)
- Family notifications (family-wide notifications)
- Family privacy (default privacy settings)
- Family timezone (for scheduling)

**Member-Specific Settings:**
- Individual language (override family default)
- Individual theme (override family default)
- Individual notifications (personal notifications)
- Individual privacy (personal privacy settings)

#### Parental Controls (For Children)

**Content Filtering:**
- Age-appropriate content
- Content restrictions
- Tool access restrictions
- Community access restrictions

**Time Limits:**
- Daily time limits
- Weekly time limits
- Time restrictions (time of day)
- Break reminders

**Activity Monitoring:**
- Activity reports (daily, weekly, monthly)
- Usage statistics
- Tool usage tracking
- Community participation tracking

**Approval Requirements:**
- Tool access approval
- Community participation approval
- Review posting approval
- Discussion posting approval

#### Family Management

**Admin Actions:**
- Add/remove members
- Change member roles
- Manage family subscription
- Update family settings
- View family activity
- Manage family preferences

**Member Actions:**
- Update own profile
- Update own preferences
- Leave family group
- Request role change
- View family activity (if permission granted)

---

## 🔧 Technical Requirements

### Database Schema

#### Family Groups Table

```sql
CREATE TABLE public.family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name TEXT NOT NULL,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    family_type TEXT NOT NULL DEFAULT 'household',
    max_members INTEGER DEFAULT 6,
    subscription_id UUID REFERENCES public.family_subscriptions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_family_groups_admin_user_id ON public.family_groups(admin_user_id);
CREATE INDEX idx_family_groups_subscription_id ON public.family_groups(subscription_id);
```

#### Family Members Table

```sql
CREATE TABLE public.family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    relationship TEXT,
    age INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(family_group_id, user_id)
);

-- Indexes
CREATE INDEX idx_family_members_family_group_id ON public.family_members(family_group_id);
CREATE INDEX idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX idx_family_members_role ON public.family_members(role);
CREATE INDEX idx_family_members_status ON public.family_members(status);
```

#### Family Subscriptions Table

```sql
CREATE TABLE public.family_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan_name TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_family_subscriptions_family_group_id ON public.family_subscriptions(family_group_id);
CREATE INDEX idx_family_subscriptions_stripe_subscription_id ON public.family_subscriptions(stripe_subscription_id);
CREATE INDEX idx_family_subscriptions_status ON public.family_subscriptions(status);
```

### Row Level Security (RLS) Policies

#### Family Groups Policies

```sql
-- Enable RLS
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;

-- Family members can view their family group
CREATE POLICY "Family members can view family group" ON public.family_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members
            WHERE family_group_id = family_groups.id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Family admin can update family group
CREATE POLICY "Family admin can update family group" ON public.family_groups
    FOR UPDATE USING (admin_user_id = auth.uid());

-- Family admin can delete family group (with restrictions)
CREATE POLICY "Family admin can delete family group" ON public.family_groups
    FOR DELETE USING (admin_user_id = auth.uid());
```

#### Family Members Policies

```sql
-- Enable RLS
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Family members can view other family members
CREATE POLICY "Family members can view family members" ON public.family_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members fm
            WHERE fm.family_group_id = family_members.family_group_id
            AND fm.user_id = auth.uid()
            AND fm.status = 'active'
        )
    );

-- Family admin can add/remove family members
CREATE POLICY "Family admin can manage family members" ON public.family_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.family_groups
            WHERE id = family_members.family_group_id
            AND admin_user_id = auth.uid()
        )
    );

-- Family members can update their own membership
CREATE POLICY "Family members can update own membership" ON public.family_members
    FOR UPDATE USING (user_id = auth.uid());

-- Family members can leave family group
CREATE POLICY "Family members can leave family group" ON public.family_members
    FOR DELETE USING (user_id = auth.uid());
```

#### Family Subscriptions Policies

```sql
-- Enable RLS
ALTER TABLE public.family_subscriptions ENABLE ROW LEVEL SECURITY;

-- Family members can view family subscription
CREATE POLICY "Family members can view family subscription" ON public.family_subscriptions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_members
            WHERE family_group_id = family_subscriptions.family_group_id
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

-- Family admin can manage family subscription
CREATE POLICY "Family admin can manage family subscription" ON public.family_subscriptions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.family_groups
            WHERE id = family_subscriptions.family_group_id
            AND admin_user_id = auth.uid()
        )
    );
```

### Access Control Functions

#### Check Family Membership

```sql
CREATE OR REPLACE FUNCTION public.is_family_member(
    family_group_uuid UUID,
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.family_members
        WHERE family_group_id = family_group_uuid
        AND user_id = user_uuid
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Check Family Admin

```sql
CREATE OR REPLACE FUNCTION public.is_family_admin(
    family_group_uuid UUID,
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.family_groups
        WHERE id = family_group_uuid
        AND admin_user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Get Family Subscription Access

```sql
CREATE OR REPLACE FUNCTION public.has_family_subscription_access(
    user_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.family_members fm
        JOIN public.family_subscriptions fs ON fs.family_group_id = fm.family_group_id
        WHERE fm.user_id = user_uuid
        AND fm.status = 'active'
        AND fs.status = 'active'
        AND (fs.current_period_end IS NULL OR fs.current_period_end > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Frontend Components

#### Family Management UI

**Components Needed:**
- Family profile page
- Family members list
- Family member invitation form
- Family member management (add, remove, change roles)
- Family subscription management
- Family settings page
- Family activity dashboard

#### Profile Integration

**Components Needed:**
- Family membership badge (on individual profiles)
- Family profile link (on individual profiles)
- Family activity section (on individual profiles)
- Family privacy controls (in profile settings)
- Family member list (on family profile)

#### Subscription Integration

**Components Needed:**
- Family plan selection (in catalog access page)
- Family subscription management (in account page)
- Family member access (in tool access pages)
- Family subscription status (in account page)

---

## 💼 Business Model Implications

### Pricing Structure

#### Implemented: Per-Member Family Pricing

**Family All-Tools Plan:**
- **Price:** CHF 3.50 per member/month or CHF 38.50 per member/year
- **Members:** Flexible (recommended max 6-8)
- **Example (6 members):** CHF 21/month or CHF 231/year
- **Savings:** 30% per member vs. individual (CHF 3.50 vs CHF 5/month)

**Family Supporter Plan:**
- **Price:** CHF 5 per member/month or CHF 55 per member/year
- **Members:** Flexible (recommended max 6-8)
- **Example (6 members):** CHF 30/month or CHF 330/year
- **Savings:** 37.5% per member vs. individual (CHF 5 vs CHF 8/month)

### Revenue Impact Analysis

#### Scenario A: Individual Subscriptions Only

**Monthly Revenue:**
- 1000 individual subscribers (avg CHF 6.50/month) = CHF 6,500/month
  - 600 × CHF 5/month (All-Tools) = CHF 3,000
  - 400 × CHF 8/month (Supporter) = CHF 3,200
- After Stripe fees (3%): CHF 6,305/month
- After tax (~25%): CHF 4,729/month = CHF 56,748/year

#### Scenario B: Mixed (Families + Individuals) - Per-Member Pricing

**Monthly Revenue:**
- 200 family plans (avg 3 members, avg CHF 4.25/member) = CHF 2,550/month
  - 120 families × 3 members × CHF 3.50 = CHF 1,260 (All-Tools)
  - 80 families × 3 members × CHF 5 = CHF 1,200 (Supporter)
- 400 individual subscribers = CHF 3,200/month
  - 240 × CHF 5/month (All-Tools) = CHF 1,200
  - 160 × CHF 8/month (Supporter) = CHF 1,280
- **Total: CHF 5,750/month**
- After Stripe fees (3%): CHF 5,578/month
- After tax (~25%): CHF 4,183/month = CHF 50,196/year
- **Users: 1,000 (600 family members + 400 individuals)**

**Analysis:**
- ⚠️ Lower revenue (CHF 5,750 vs CHF 6,500)
- ✅ More users (1,000 vs 1,000, but 600 are family members)
- ✅ Better retention (families less likely to cancel)
- ✅ Better engagement (family features, community)
- ✅ Accessible pricing attracts more families

#### Scenario C: Optimized Family Plans - Per-Member Pricing

**Monthly Revenue:**
- 300 family plans (avg 4 members, avg CHF 4.25/member) = CHF 5,100/month
  - 180 families × 4 members × CHF 3.50 = CHF 2,520 (All-Tools)
  - 120 families × 4 members × CHF 5 = CHF 2,400 (Supporter)
- 200 individual subscribers = CHF 1,600/month
  - 120 × CHF 5/month (All-Tools) = CHF 600
  - 80 × CHF 8/month (Supporter) = CHF 640
- **Total: CHF 6,700/month**
- After Stripe fees (3%): CHF 6,499/month
- After tax (~25%): CHF 4,874/month = CHF 58,488/year
- **Users: 1,400 (1,200 family members + 200 individuals)**

**Analysis:**
- ✅ Similar revenue (CHF 6,700 vs CHF 6,500)
- ✅ More users (1,400 vs 1,000)
- ✅ Better retention (families less likely to cancel)
- ✅ Better engagement (family features, community)
- ✅ Stronger community (more active users)
- ✅ Flexible pricing attracts diverse family sizes

### Market Fit

#### Vaud Market

**Family-Focused Market:**
- ✅ Families value shared access
- ✅ Parents want tools for children
- ✅ Households want to save money
- ✅ Families appreciate family-focused services
- ✅ French-speaking families need French support

**"Petite Gens" Market:**
- ✅ Families need accessible pricing
- ✅ Families want simple management
- ✅ Families value family guidance services
- ✅ Families appreciate community connection
- ✅ Families want to support artisan approach

### Competitive Advantage

**Family Plans Differentiate BitMinded:**
- ✅ Not just individual subscriptions
- ✅ Family-focused approach
- ✅ Family guidance services integration
- ✅ Family community features
- ✅ Family-friendly pricing

---

## 🛠️ Implementation Considerations

### Phase 1: Foundation (Weeks 1-2)

**Database Setup:**
- Create family_groups table
- Create family_members table
- Create family_subscriptions table
- Implement RLS policies
- Create database functions
- Test database schema

**API Development:**
- Family management API (create, read, update, delete)
- Family member API (invite, accept, remove, update roles)
- Family subscription API (create, update, cancel)
- Test API endpoints

### Phase 2: Family Management UI (Weeks 3-4)

**Family Management:**
- Create family account page
- Family members list component
- Family member invitation form
- Family member management (add, remove, change roles)
- Family settings page
- Test family management flow

### Phase 3: Family Subscriptions (Weeks 5-6)

**Stripe Integration:**
- Create family subscription products in Stripe
- Integrate family subscriptions with Stripe
- Implement family subscription sharing
- Family subscription management UI
- Test family subscription flow

### Phase 4: Family Profiles (Weeks 7-8)

**Profile Integration:**
- Create family profile pages
- Implement linked family profiles
- Family activity tracking
- Family privacy controls
- Family member recognition
- Test family profile features

### Phase 5: Family Features (Weeks 9-10)

**Family Services:**
- Family guidance services integration
- Family community features
- Family reviews and discussions
- Family commissions integration
- Test family features

### Phase 6: Polish & Launch (Weeks 11-12)

**Final Steps:**
- Review and polish all family features
- Test all functionality with real users
- Fix bugs and improve user experience
- Prepare launch announcement
- Launch family plans

---

## ✅ Recommendations

### Pricing Recommendation (Implemented)

**Family All-Tools Plan:**
- **Price:** CHF 3.50 per member/month or CHF 38.50 per member/year
- **Members:** Flexible (recommended max 6-8 members)
- **Includes:** All-Tools access for all family members
- **Savings:** 30% per member vs. individual (CHF 3.50 vs CHF 5/month)
- **Yearly Bonus:** 1 month free (11 months for price of 12)

**Family Supporter Plan:**
- **Price:** CHF 5 per member/month or CHF 55 per member/year
- **Members:** Flexible (recommended max 6-8 members)
- **Includes:** All-Tools + Supporter benefits for all members
- **Savings:** 37.5% per member vs. individual (CHF 5 vs CHF 8/month)
- **Yearly Bonus:** 1 month free (11 months for price of 12)

**Examples:**
- 2-member family (All-Tools): CHF 7/month or CHF 77/year (vs. CHF 10/month individual)
- 4-member family (All-Tools): CHF 14/month or CHF 154/year (vs. CHF 20/month individual)
- 6-member family (All-Tools): CHF 21/month or CHF 231/year (vs. CHF 30/month individual)

**Rationale:**
- ✅ Flexible pricing that scales with family size
- ✅ Accessible pricing that doesn't deter smaller families
- ✅ Clear per-member value proposition
- ✅ Fair pricing (pay for what you use)
- ✅ Volume strategy (more users, lower per-user revenue)
- ✅ Better retention (families less likely to cancel)
- ✅ Yearly option provides additional savings

### Family Definition Recommendation

**Recommended: Parent-Child + Household Members**
- Parents create family account
- Add children (under 18)
- Optionally add household members (partner, grandparents, etc.)
- Max 6-8 members per family
- Email verification for invitations

**Rationale:**
- ✅ Clear family structure (parent-child)
- ✅ Flexible for diverse families
- ✅ Prevents abuse (max members, verification)
- ✅ Aligns with guidance services (family sessions)
- ✅ Natural for "petite gens" market

### Implementation Priority

**Priority 1: Foundation (Must Have)**
- Family groups and members
- Family subscriptions
- Family management UI
- Family member invitations

**Priority 2: Features (Should Have)**
- Family profiles
- Family activity tracking
- Family privacy controls
- Family member recognition

**Priority 3: Advanced (Nice to Have)**
- Family guidance services integration
- Family community features
- Family reviews and discussions
- Family commissions integration

---

## ❓ Open Questions

### 1. Family Definition

**Questions:**
- What constitutes a "family"? (household, parent-child, custom)
- How many members per family? (4, 6, 8, unlimited)
- How to verify family relationships? (email, address, documentation)
- How to prevent abuse? (max members, verification, moderation)

**Recommendation:**
- Parent-child + household members
- Max 6-8 members per family
- Email verification for invitations
- Manual review for suspicious cases

### 2. Pricing Structure

**Questions:**
- Fixed price vs. per-member pricing?
- How to price family plans? (CHF 15, 18, 20/month)
- Should family plans include Supporter benefits?
- How to handle family plan upgrades/downgrades?

**Decision:** Per-Member Pricing - **IMPLEMENTED**
- **All-Tools:** CHF 3.50 per member/month or CHF 38.50 per member/year
- **Supporter:** CHF 5 per member/month or CHF 55 per member/year
- Flexible member count (recommended max 6-8 members)
- Clear upgrade/downgrade path needed
- Prorated billing for changes needed

### 3. User Management

**Questions:**
- Who can manage family accounts? (admin only, parents, all)
- How to handle family member invitations? (email, username, link)
- How to handle family member removal? (admin, member, automatic)
- How to handle family member roles? (admin, parent, member, child)

**Recommendation:**
- Admin manages family account
- Parents can manage children
- Email/username invitations
- Admin can remove members
- Members can leave family

### 4. Profile Management

**Questions:**
- What family members can see? (activity, reviews, discussions)
- How to handle privacy? (default settings, per-member settings)
- How to handle parental controls? (for children, content filtering)
- How to handle family activity tracking? (aggregated, individual)

**Recommendation:**
- Family members can see family activity (with permission)
- Default privacy settings (family-visible)
- Parental controls for children (content filtering, time limits)
- Aggregated family activity (with individual breakdown)

### 5. Technical Implementation

**Questions:**
- How to implement family subscriptions? (Stripe, Supabase, custom)
- How to handle family member authentication? (shared, individual)
- How to handle family member access control? (RLS, application-level)
- How to handle family member data sharing? (privacy, security)

**Recommendation:**
- Stripe for family subscriptions
- Individual authentication (each member has own account)
- RLS policies for access control
- Privacy controls for data sharing

---

## 🎯 Decision Points

### Decision 1: Family Definition

**Options:**
- A) Household (same address)
- B) Parent-child relationship
- C) Custom family definition
- D) Mixed approach (parent-child + household)

**Recommendation:** Option D (Mixed Approach)

### Decision 2: Family Pricing

**Options:**
- A) Fixed price (CHF 15-20/month)
- B) Per-member pricing (CHF 3.50/member for All-Tools, CHF 5/member for Supporter)
- C) Tiered plans (Small, Medium, Large)

**Decision:** Option B (Per-Member Pricing) - **IMPLEMENTED**
- **All-Tools:** CHF 3.50 per member/month or CHF 38.50 per member/year
- **Supporter:** CHF 5 per member/month or CHF 55 per member/year
- Flexible member count, accessible pricing, clear value proposition

### Decision 3: Max Family Members

**Options:**
- A) 4 members
- B) 6 members
- C) 8 members
- D) Unlimited

**Recommendation:** Option B (6 members)

### Decision 4: Family Member Roles

**Options:**
- A) Simple (admin, member)
- B) Detailed (admin, parent, guardian, member, child)
- C) Custom (user-defined roles)

**Recommendation:** Option B (Detailed roles)

### Decision 5: Family Privacy

**Options:**
- A) Open (all family activity visible)
- B) Private (family activity hidden)
- C) Controlled (per-member privacy settings)

**Recommendation:** Option C (Controlled privacy)

---

## 📊 Success Metrics

### Family Plan Adoption

**Key Metrics:**
- Number of family plans created
- Average family size (members per family)
- Family plan conversion rate (individual → family)
- Family plan retention rate (monthly, quarterly, yearly)

### Family Engagement

**Key Metrics:**
- Family member activity (tool usage, reviews, discussions)
- Family guidance sessions booked
- Family community participation
- Family member retention

### Revenue Impact

**Key Metrics:**
- Family plan revenue (monthly, yearly)
- Average revenue per family plan
- Family plan vs. individual subscription revenue
- Family plan lifetime value

### User Satisfaction

**Key Metrics:**
- Family plan satisfaction (surveys, feedback)
- Family member satisfaction (surveys, feedback)
- Family plan cancellation reasons
- Family plan upgrade/downgrade rates

---

## 📝 Notes

### Key Insights

1. **Family Plans Create Value:**
   - Strong value proposition (69% savings)
   - Accessible to "petite gens"
   - Better retention (families less likely to cancel)
   - Better engagement (family features, community)

2. **Family Plans Support Volume Strategy:**
   - More users (1,400 vs 1,000)
   - Similar revenue (CHF 7,000 vs CHF 8,000)
   - Better retention and engagement
   - Stronger community

3. **Family Plans Align with Services:**
   - Family guidance services exist
   - Family community features planned
   - Family commissions possible
   - Family digital wellbeing focus

4. **Family Plans Differentiate BitMinded:**
   - Not just individual subscriptions
   - Family-focused approach
   - Family-friendly pricing
   - Family community features

5. **Family Plans Require Careful Implementation:**
   - Complex user management
   - Privacy and security considerations
   - Family member recognition
   - Family subscription sharing

### Implementation Challenges

1. **User Management Complexity:**
   - Family member invitations
   - Family member roles
   - Family member management
   - Family member recognition

2. **Privacy and Security:**
   - Family member data sharing
   - Family activity tracking
   - Family privacy controls
   - Parental controls for children

3. **Subscription Management:**
   - Family subscription sharing
   - Family subscription billing
   - Family subscription access control
   - Family subscription upgrades/downgrades

4. **Technical Complexity:**
   - Database schema (family_groups, family_members, family_subscriptions)
   - RLS policies (family access control)
   - API development (family management)
   - Frontend components (family UI)

---

## 📚 Related Documents

- [Services Pricing Strategy](./services/PRICING-STRATEGY.md)
- [Community Page Planning](./community/README.md)
- [Business Model](../business-legal/BUSINESS_MODEL.md)
- [Database Schema](./supabase/schema/database-schema.sql)
- [Catalog Access](./services/catalog-access/index.html)
- [Tech Support](./services/tech-support/index.html)

---

## 🔄 Changelog

### January 2025
- Initial family plans analysis
- Family plan structure planning
- User management planning
- Profile management planning
- Technical requirements documentation
- Business model implications analysis
- Implementation considerations
- Recommendations and decision points
- **Pricing structure implemented:** Per-member pricing (CHF 3.50/member for All-Tools, CHF 5/member for Supporter)
- **UI implementation:** Family pricing toggle added to catalog access page with yearly options

---

## 🔧 Webhook Handler Implementation Requirements

### Overview

Family plan purchases need special handling in the Stripe webhook handler to:
- Create or link to family groups
- Grant access to all family members (not just the purchaser)
- Track family subscriptions separately from individual purchases
- Handle family member additions/removals

### Current Status

**Webhook Handler:** ✅ Implemented (handles 29 events)
- Currently processes individual purchases only
- Creates `product_purchases` records for single users
- **Family plan support:** ❌ Not yet implemented

### Implementation Approach

Family plan logic can be added directly to the existing webhook handler using conditional routing:

```typescript
// In handleCheckoutSessionCompleted:
// 1. Detect if purchase is a family plan
const isFamilyPlan = session.metadata?.is_family_plan === 'true' 
  || productName.includes('Family')
  || productName.includes('family')

// 2. Route to appropriate handler
if (isFamilyPlan) {
  await handleFamilyPlanPurchase(supabaseAdmin, session, lineItems, userId, isLiveMode)
} else {
  // Existing individual purchase logic (already implemented)
  await handleIndividualPurchase(...)
}
```

### Prerequisites

**1. Database Tables (MUST EXIST FIRST)**
- ✅ `family_groups` table
- ✅ `family_members` table
- ✅ `family_subscriptions` table
- ✅ RLS policies for all tables
- ✅ Helper functions (see below)

**2. Helper Functions Required**
- `findOrCreateFamilyGroup(userId, familyName?)` - Find existing or create new family group
- `getActiveFamilyMembers(familyGroupId)` - Get all active family members
- `grantFamilyAccess(familyGroupId, productId, subscriptionId)` - Grant access to all members
- `revokeFamilyAccess(familyGroupId, productId)` - Revoke access from all members
- `isFamilyPlanProduct(stripeProductId)` - Check if product is a family plan

**3. Stripe Integration**
- Family plan products must have metadata: `{ is_family_plan: 'true' }`
- OR product name must contain "Family" or "family"
- Checkout session metadata can include: `{ family_group_id: '...' }` (if family already exists)

### Webhook Events to Handle

**For Family Plans, update these event handlers:**

1. **`checkout.session.completed`**
   - Detect family plan purchase
   - Create/find family group
   - Create `family_subscriptions` record
   - Grant access to all family members
   - Create individual `product_purchases` records for each member (for tracking)

2. **`customer.subscription.created`**
   - Link subscription to `family_subscriptions` table
   - Update family group with subscription ID

3. **`customer.subscription.updated`**
   - Update `family_subscriptions` status
   - Handle member count changes (if subscription quantity changed)
   - Update access for all members

4. **`customer.subscription.deleted`**
   - Mark `family_subscriptions` as cancelled
   - Revoke access from all family members

5. **`invoice.paid`**
   - Update `family_subscriptions` billing period
   - Renew access for all members
   - Handle subscription quantity changes

### Implementation Details

#### 1. Detection Logic

```typescript
function isFamilyPlanPurchase(session: any, lineItems: any[]): boolean {
  // Check checkout session metadata
  if (session.metadata?.is_family_plan === 'true') {
    return true
  }
  
  // Check product names
  for (const item of lineItems) {
    const productName = typeof item.price?.product === 'string'
      ? null  // Would need to fetch product
      : item.price?.product?.name || ''
    
    if (productName?.toLowerCase().includes('family')) {
      return true
    }
  }
  
  // Check database product metadata
  // (if products table has is_family_plan flag)
  
  return false
}
```

#### 2. Family Group Creation/Linking

```typescript
async function findOrCreateFamilyGroup(
  supabaseAdmin: any,
  userId: string,
  familyName?: string
): Promise<string> {
  // Check if user is already a family admin
  const { data: existingFamily } = await supabaseAdmin
    .from('family_groups')
    .select('id')
    .eq('admin_user_id', userId)
    .maybeSingle()
  
  if (existingFamily) {
    return existingFamily.id
  }
  
  // Check if user is already a member
  const { data: memberFamily } = await supabaseAdmin
    .from('family_members')
    .select('family_group_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()
  
  if (memberFamily) {
    return memberFamily.family_group_id
  }
  
  // Create new family group
  const { data: newFamily, error } = await supabaseAdmin
    .from('family_groups')
    .insert({
      admin_user_id: userId,
      family_name: familyName || 'My Family',
      family_type: 'household',
      max_members: 6
    })
    .select('id')
    .single()
  
  if (error) throw error
  
  // Add creator as admin member
  await supabaseAdmin
    .from('family_members')
    .insert({
      family_group_id: newFamily.id,
      user_id: userId,
      role: 'admin',
      relationship: 'admin',
      status: 'active',
      is_verified: true,
      joined_at: new Date().toISOString()
    })
  
  return newFamily.id
}
```

#### 3. Grant Access to All Members

```typescript
async function grantFamilyAccess(
  supabaseAdmin: any,
  familyGroupId: string,
  productId: string,
  subscriptionId: string | null,
  stripeCustomerId: string,
  amount: number,
  currency: string,
  interval: string | null
): Promise<void> {
  // Get all active family members
  const { data: members } = await supabaseAdmin
    .from('family_members')
    .select('user_id')
    .eq('family_group_id', familyGroupId)
    .eq('status', 'active')
  
  if (!members || members.length === 0) {
    throw new Error('No active family members found')
  }
  
  // Create purchase record for each member
  for (const member of members) {
    await supabaseAdmin
      .from('product_purchases')
      .insert({
        user_id: member.user_id,
        product_id: productId,
        purchase_type: subscriptionId ? 'subscription' : 'one_time',
        amount_paid: amount / members.length, // Per-member amount
        currency: currency,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: stripeCustomerId,
        user_type: 'individual', // Family members are still individuals
        subscription_interval: interval,
        status: 'active',
        payment_status: 'succeeded'
      })
  }
  
  // Create/update family subscription record
  const { data: existingSub } = await supabaseAdmin
    .from('family_subscriptions')
    .select('id')
    .eq('family_group_id', familyGroupId)
    .eq('plan_name', productId) // Or use plan name from product
    .maybeSingle()
  
  if (existingSub) {
    // Update existing subscription
    await supabaseAdmin
      .from('family_subscriptions')
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: stripeCustomerId,
        status: 'active',
        current_period_start: new Date().toISOString(),
        // Update period_end based on interval
        updated_at: new Date().toISOString()
      })
      .eq('id', existingSub.id)
  } else {
    // Create new family subscription
    await supabaseAdmin
      .from('family_subscriptions')
      .insert({
        family_group_id: familyGroupId,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: stripeCustomerId,
        plan_name: productId, // Or plan name
        status: 'active',
        current_period_start: new Date().toISOString()
        // Set period_end based on interval
      })
  }
  
  // Update family group with subscription reference
  await supabaseAdmin
    .from('family_groups')
    .update({ 
      subscription_id: existingSub?.id || /* new subscription id */,
      updated_at: new Date().toISOString()
    })
    .eq('id', familyGroupId)
}
```

#### 4. Handle Member Changes

When family members are added/removed:
- **Member added:** Create `product_purchase` record for new member
- **Member removed:** Mark their `product_purchase` as expired/cancelled
- **Subscription quantity changed:** Update member count in `family_subscriptions`

### Testing Requirements

**Test Scenarios:**
1. ✅ New family plan purchase (creates family group)
2. ✅ Existing family member purchases (links to existing group)
3. ✅ Subscription renewal (updates all members)
4. ✅ Member added mid-subscription (grants access)
5. ✅ Member removed (revokes access)
6. ✅ Subscription cancelled (revokes all access)

### Migration Path

**Phase 1: Database Setup**
1. Create `family_groups` table
2. Create `family_members` table
3. Create `family_subscriptions` table
4. Add RLS policies
5. Create helper functions

**Phase 2: Webhook Updates**
1. Add detection logic
2. Implement `handleFamilyPlanPurchase` function
3. Update existing handlers to support family plans
4. Test with Stripe CLI

**Phase 3: Frontend Integration**
1. Family management UI
2. Family member invitations
3. Link purchases to family groups

### Notes

- Family plan purchases still create individual `product_purchases` records for each member (for tracking and access control)
- Family subscriptions are tracked separately in `family_subscriptions` table
- The purchaser becomes the family admin automatically
- Access is granted immediately upon purchase to all existing family members
- New members added later get access automatically (if subscription is active)

---

## 🔗 Related Documentation

### Planning & Implementation
- [Priority List - Active Items](../planning/PRIORITY-LIST-TO-DO.md) - See Phase 2, Item #15.9 (Family Plan Payment Setup & Stripe Integration) for implementation status and tasks
- [Priority List - Completed Items](../planning/PRIORITY-LIST-COMPLETED-ITEMS.md) - See completed payment infrastructure that family plans depend on

### Related Payment & Financial Docs
- [PostFinance Integration Plan](./POSTFINANCE-INTEGRATION-PLAN.md) - Payment method logic (may affect family plan in-person services)
- [Point-of-Sale Readiness Plan](./POINT-OF-SALE-READINESS.md) - Invoice/contract workflows for family services

### Business Context
- [Business Model](../business-legal/BUSINESS_MODEL.md) - Family plans align with "petite gens" market strategy

---

**Last Updated:** November 23, 2025  
**Next Review:** After full implementation is complete

**Status:** 🚧 Partial Implementation - Pricing UI Complete, Webhook Implementation Pending

