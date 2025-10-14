# Analytics Dashboard Component Specification

## Overview
Comprehensive analytics and insights dashboard with interactive charts, user behavior tracking, and business intelligence.

## Responsibilities
- Display user analytics and metrics
- Track user engagement and behavior
- Visualize growth and trends
- Monitor conversion funnels
- Provide product usage insights
- Generate custom analytics reports

## UI Components

### Header Section
- Title: "Analytics Dashboard"
- Date range selector (with presets + custom)
- **Refresh Data** button
- **Export Analytics** button
- **Custom Report Builder** button

### Quick Stats Row

**Stat Cards**:
1. **Total Users** (with growth %)
2. **Active Users** (with DAU/MAU ratio)
3. **New Signups** (with conversion rate)
4. **Engagement Rate** (% of active users)
5. **Retention Rate** (30-day retention)
6. **Churn Rate** (monthly churn %)

### Charts & Visualizations ✅ REAL-TIME

**All charts update in real-time** (WebSocket or polling every 10-30 seconds)

#### 1. User Growth Chart (Line Chart) - REAL-TIME
- Total users over time (live updates)
- New users per day/week/month
- Active users trend (updates as users log in)
- Toggle between daily/weekly/monthly
- Compare to previous period
- Smooth animations for new data points

#### 2. User Acquisition Funnel
- Visitors (if tracked)
- Signups
- Email verified
- First subscription
- Active users
- Conversion rate at each step

#### 3. Engagement Metrics (Bar/Line Chart)
- DAU (Daily Active Users)
- WAU (Weekly Active Users)
- MAU (Monthly Active Users)
- DAU/MAU ratio (stickiness)
- Session duration (average)

#### 4. Product Usage (Pie/Bar Chart)
- Tool usage breakdown
- Most popular tools
- Least used tools
- Usage frequency by tool
- Feature adoption rates

#### 5. Retention Cohort Analysis (Heatmap)
- Cohorts by signup month
- Retention % over time
- Color-coded retention rates
- Monthly retention trends

#### 6. Geographic Distribution (Map)
- Users by country
- Subscriptions by region
- Revenue by location
- Growth by geography

#### 7. User Activity Timeline
- Real-time activity feed
- Recent signups
- Recent subscriptions
- Recent logins
- Tool access events

### Conversion Funnel Section

**Funnel Steps**:
1. Landing page visit
2. Signup started
3. Account created
4. Email verified
5. Profile completed
6. First tool viewed
7. Subscription purchased

**Metrics Per Step**:
- Count
- Conversion rate
- Drop-off rate
- Average time to next step

### User Segmentation

**Segment Types**:
- By signup date (cohorts)
- By subscription status
- By product usage
- By engagement level
- By revenue contribution
- Custom segments

**For Each Segment**:
- User count
- Average LTV
- Retention rate
- Engagement metrics
- Growth trend

### Custom Report Builder

**Report Configuration**:
- Select metrics (multi-select)
- Choose chart type
- Set date range
- Apply filters
- Group by dimension
- **Save Report** (for reuse)
- **Schedule Report** (email delivery)

### Behavioral Analytics

**Track User Actions**:
- Page views
- Feature usage
- Click patterns
- Time on page
- Scroll depth
- Error encounters
- Search queries

**Event Tracking**:
- Custom events
- Conversion events
- Engagement events
- Error events

## Real-Time Implementation ✅

### Update Strategy

**Option 1: WebSocket (Recommended for true real-time)**
```javascript
// Establish WebSocket connection
const ws = new WebSocket('wss://bitminded.ch/analytics');

ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    
    // Update specific metric
    switch (update.type) {
        case 'new_user':
            updateUserCount(update.data);
            animateNewUserOnChart(update.data);
            break;
        case 'new_subscription':
            updateSubscriptionCount(update.data);
            break;
        case 'user_activity':
            updateActivityFeed(update.data);
            break;
    }
};
```

**Option 2: Polling (Simpler, still near real-time)**
```javascript
// Poll every 10 seconds for updates
setInterval(async () => {
    const latestData = await fetchLatestAnalytics();
    
    // Only update if data changed
    if (hasChanged(latestData, currentData)) {
        updateCharts(latestData);
        animateChanges();
    }
}, 10000); // 10 second refresh
```

### Chart Animation
```javascript
// Smooth updates with Chart.js
function updateChartWithAnimation(chart, newData) {
    chart.data.datasets[0].data.push(newData);
    chart.update('active'); // Animate new point
}
```

### Real-Time Activity Feed
```javascript
// Listen for new events
supabase
    .channel('analytics_events')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_events'
    }, (payload) => {
        // Add new event to feed in real-time
        addEventToFeed(payload.new);
        updateMetrics(payload.new);
    })
    .subscribe();
```

## Functionality

### Load Analytics Data
```javascript
async loadAnalyticsData(dateRange) {
    // 1. Load user metrics
    const userMetrics = await this.loadUserMetrics(dateRange);
    
    // 2. Load engagement metrics
    const engagementMetrics = await this.loadEngagementMetrics(dateRange);
    
    // 3. Load conversion funnel
    const funnelData = await this.loadConversionFunnel(dateRange);
    
    // 4. Load product usage
    const productUsage = await this.loadProductUsage(dateRange);
    
    // 5. Load retention data
    const retentionData = await this.loadRetentionData();
    
    // 6. Load geographic data
    const geoData = await this.loadGeographicData();
    
    return {
        userMetrics,
        engagementMetrics,
        funnelData,
        productUsage,
        retentionData,
        geoData
    };
}
```

### Calculate Engagement Metrics
```javascript
async calculateEngagement(dateRange) {
    // DAU (Daily Active Users)
    const dau = await this.getDailyActiveUsers(dateRange);
    
    // MAU (Monthly Active Users)
    const mau = await this.getMonthlyActiveUsers(dateRange);
    
    // Stickiness (DAU/MAU ratio)
    const stickiness = (dau / mau) * 100;
    
    // Session duration
    const avgSessionDuration = await this.getAvgSessionDuration(dateRange);
    
    // Engagement rate
    const totalUsers = await this.getTotalUsers();
    const engagementRate = (mau / totalUsers) * 100;
    
    return { dau, mau, stickiness, avgSessionDuration, engagementRate };
}
```

### Track User Events
```javascript
async trackEvent(eventName, userId, properties) {
    // 1. Validate event data
    // 2. Store event in analytics database
    // 3. Update real-time metrics
    // 4. Trigger any event-based actions
    
    await supabase
        .from('user_events')
        .insert({
            event_name: eventName,
            user_id: userId,
            properties: properties,
            timestamp: new Date()
        });
}
```

### Generate Cohort Analysis
```javascript
async generateCohortAnalysis() {
    // 1. Group users by signup month
    // 2. Track retention for each cohort
    // 3. Calculate retention %
    // 4. Generate heatmap data
    
    const cohorts = await this.getUserCohorts();
    const retentionData = [];
    
    for (const cohort of cohorts) {
        const retention = await this.calculateCohortRetention(cohort);
        retentionData.push({
            cohort: cohort.month,
            retention: retention
        });
    }
    
    return retentionData;
}
```

## Database Schema

### User Events Table
```sql
CREATE TABLE user_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    event_name TEXT NOT NULL,
    event_category TEXT,
    properties JSONB,
    timestamp TIMESTAMP DEFAULT NOW(),
    session_id TEXT,
    ip_address INET,
    user_agent TEXT
);

-- Indexes for performance
CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_event_name ON user_events(event_name);
CREATE INDEX idx_user_events_timestamp ON user_events(timestamp);
```

### User Sessions Table
```sql
CREATE TABLE user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    session_start TIMESTAMP NOT NULL,
    session_end TIMESTAMP,
    duration_seconds INTEGER,
    page_views INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,
    country TEXT,
    city TEXT
);
```

### Analytics Queries

```sql
-- DAU (Daily Active Users)
SELECT COUNT(DISTINCT user_id) as dau
FROM user_events
WHERE DATE(timestamp) = CURRENT_DATE;

-- MAU (Monthly Active Users)
SELECT COUNT(DISTINCT user_id) as mau
FROM user_events
WHERE timestamp >= date_trunc('month', NOW());

-- User Growth
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_users,
    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as total_users
FROM user_profiles
WHERE created_at >= $startDate
GROUP BY DATE(created_at)
ORDER BY date;

-- Retention Cohort
SELECT 
    date_trunc('month', up.created_at) as cohort_month,
    date_trunc('month', ue.timestamp) as activity_month,
    COUNT(DISTINCT up.id) as active_users,
    COUNT(DISTINCT up.id) * 100.0 / 
        (SELECT COUNT(*) FROM user_profiles 
         WHERE date_trunc('month', created_at) = date_trunc('month', up.created_at)) as retention_rate
FROM user_profiles up
LEFT JOIN user_events ue ON ue.user_id = up.id
WHERE up.created_at >= date_trunc('month', NOW() - INTERVAL '12 months')
GROUP BY cohort_month, activity_month
ORDER BY cohort_month, activity_month;
```

## API Methods

```javascript
class AnalyticsDashboard {
    async init()
    async loadAnalyticsData(dateRange)
    async loadUserMetrics(dateRange)
    async loadEngagementMetrics(dateRange)
    async loadConversionFunnel(dateRange)
    async loadProductUsage(dateRange)
    async loadRetentionData()
    async loadGeographicData()
    async calculateEngagement(dateRange)
    async generateCohortAnalysis()
    async trackEvent(eventName, userId, properties)
    async createCustomReport(config)
    async saveReport(reportConfig)
    async scheduleReport(reportId, schedule)
    async exportAnalytics(format)
    updateDateRange(startDate, endDate)
    refreshData()
}
```

## Translations Keys
- `analytics_dashboard`: "Analytics Dashboard"
- `total_users`: "Total Users"
- `active_users`: "Active Users"
- `new_signups`: "New Signups"
- `engagement_rate`: "Engagement Rate"
- `retention_rate`: "Retention Rate"
- `churn_rate`: "Churn Rate"
- `user_growth`: "User Growth"
- `acquisition_funnel`: "Acquisition Funnel"
- `engagement_metrics`: "Engagement Metrics"
- `product_usage`: "Product Usage"
- `retention_cohorts`: "Retention Cohorts"
- `geographic_distribution`: "Geographic Distribution"
- `conversion_funnel`: "Conversion Funnel"
- `user_segmentation`: "User Segmentation"
- `custom_report_builder`: "Custom Report Builder"
- `export_analytics`: "Export Analytics"
- `dau`: "Daily Active Users"
- `mau`: "Monthly Active Users"
- `stickiness`: "Stickiness (DAU/MAU)"

## Styling Requirements
- Interactive charts with hover details
- Color-coded metrics and trends
- Responsive grid layout
- Chart legends and tooltips
- Export-friendly layouts
- Print-optimized reports
- Loading skeletons for charts

## Dependencies
- Chart.js or D3.js (advanced charts)
- Map library (Leaflet or Mapbox)
- Supabase client
- Translation system
- Admin layout component
- Date picker component
- Export libraries (CSV, PDF)

## Security Considerations
- Anonymize sensitive user data
- Restrict access to analytics
- Log data exports
- Rate limit API calls
- Secure event tracking data

## Performance Considerations
- Cache analytics data (5-15 min)
- Lazy load charts
- Paginate large datasets
- Optimize complex queries
- Use database views for common queries
- Consider analytics-specific database

## Testing Checklist
- [ ] All charts load correctly
- [ ] Metrics calculate accurately
- [ ] Date range filters work
- [ ] Cohort analysis works
- [ ] Funnel visualization works
- [ ] Real-time updates work
- [ ] Export works (all formats)
- [ ] Custom reports save
- [ ] Scheduled reports send
- [ ] Mobile responsive
- [ ] Performance acceptable

## Implementation Priority
**Phase 3** - Advanced analytics and insights

## Future Enhancements
- AI-powered insights and recommendations
- Anomaly detection
- Predictive analytics
- A/B testing framework
- Goal tracking
- Attribution modeling
- Real-time alerts
- Custom dashboards per admin
- Integration with Google Analytics
- Heat maps for UI interactions

