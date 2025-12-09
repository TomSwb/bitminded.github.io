# BitMinded Video Production Guide

Complete guide for filming, editing, and hosting videos on the BitMinded website.

**Last Updated:** January 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Recommended Filming Specifications](#recommended-filming-specifications)
3. [Filming Setup & Checklist](#filming-setup--checklist)
4. [Post-Production Guidelines](#post-production-guidelines)
5. [Storage & Hosting Strategy](#storage--hosting-strategy)
6. [Video Types & Specifications](#video-types--specifications)
7. [Technical Implementation](#technical-implementation)
8. [Multi-Language Considerations](#multi-language-considerations)
9. [Performance & Optimization](#performance--optimization)

---

## 🎯 Overview

This guide covers everything you need to know about creating videos for the BitMinded website, from filming with an iPhone or camera to hosting them efficiently.

### Video Use Cases

- **Introduction/Hero Videos**: Short welcoming videos (15-60 seconds)
- **Tutorial Videos**: Step-by-step guides (3-10 minutes)
- **Product Demos**: Feature showcases (1-3 minutes)
- **Testimonials**: Customer stories (1-2 minutes)

---

## 🎥 Recommended Filming Specifications

### iPhone Settings

#### Resolution & Frame Rate

| Video Type | Resolution | Frame Rate | Format |
|------------|------------|------------|--------|
| Intro Videos | 1080p (1920×1080) | 30fps | High Efficiency (HEVC) |
| Tutorial Videos | 1080p (1920×1080) | 30fps | High Efficiency (HEVC) |
| Screen Recordings | 1080p (1920×1080) | 60fps | High Efficiency (HEVC) |

#### Camera Settings

**Before Filming:**
1. **Settings → Camera → Record Video**
   - Record Video: **1080p HD at 30fps**
   - HDR Video: **OFF** (avoids color issues on some displays)
   - Lock Camera: **ON** (prevents switching cameras mid-recording)

2. **Settings → Camera → Formats**
   - **Most Compatible (H.264)** recommended for direct web use
   - Or **High Efficiency (HEVC)** if converting to H.264/WebM later

3. **In Camera App:**
   - Tap to focus on your face
   - Hold to lock exposure/focus
   - Use grid lines for framing (Settings → Camera → Grid)

#### Video Stabilization

- **ON**: Prevents shaky footage
- **Cinematic Mode**: OFF (unless specifically needed)

### Dedicated Camera Settings

If using a dedicated camera:

```
Resolution: 1920×1080 (Full HD)
Frame Rate: 30fps (or 24fps for cinematic look, 60fps for UI/tutorials)
Codec: H.264 (AVCHD or MP4 container)
Bitrate: 10-15 Mbps (will compress later for web)
White Balance: Auto or Daylight (5600K)
ISO: 100-400 (keep as low as possible)
Aperture: f/2.8-4.0 (blur background, sharp face)
Shutter Speed: 1/60s for 30fps (or 1/50s for 25fps)
Picture Style: Neutral or Standard (adjust in post)
```

---

## 📹 Filming Setup & Checklist

### iPhone Filming Checklist

#### Before Filming

- [ ] Battery charged or plugged in
- [ ] Storage space available (1-2GB per minute at 1080p)
- [ ] Do Not Disturb enabled
- [ ] Camera lens cleaned
- [ ] Audio tested (speak and check levels)
- [ ] Lighting checked (even on face)
- [ ] Framing checked (rule of thirds, centered)
- [ ] Background reviewed (clean, uncluttered)
- [ ] Phone stabilized (tripod or stable surface)

#### Camera Settings

- [ ] Resolution: 1080p HD at 30fps
- [ ] HDR Video: OFF
- [ ] Video Stabilization: ON
- [ ] Grid lines: ON (helps with framing)
- [ ] Exposure: Locked (tap and hold on screen)

#### Audio Setup

**External Microphones (Recommended):**
- Lapel mic (chest clip): Best for talking head
- USB-C microphone: For iPhone
- Shotgun mic: For camera
- Wireless lavalier: Freedom of movement

**Audio Recording Tips:**
- Record in quiet space (no echo)
- Use pop filter if speaking close to mic
- Test levels before recording
- Speak clearly and at consistent volume
- For tutorials: Pause between steps to allow editing cuts

#### Lighting Setup

**Key Principles:**
- Natural light preferred (window light)
- Avoid harsh shadows (soft, diffused light)
- Front/key light on your face
- For tutorials: Ensure screen/UI is clearly visible

**Common Mistakes to Avoid:**
- Backlighting (bright window behind you)
- Uneven lighting (shadows on face)
- Too dark or too bright exposure

#### Framing Guidelines

- **Rule of thirds**: Use grid lines
- **Eye level**: Camera at or slightly above eye level
- **Headroom**: Leave some space above head
- **Centering**: Keep yourself horizontally centered
- **Background**: Clean, uncluttered, BitMinded-branded if possible

### Camera Filming Checklist

#### Camera Settings

- [ ] Resolution: 1920×1080
- [ ] Frame Rate: 30fps
- [ ] White Balance: Auto or preset (Daylight/Tungsten)
- [ ] ISO: 100-400 (keep as low as possible)
- [ ] Aperture: f/2.8-f/4 for talking head (blurred background)
- [ ] Shutter Speed: 1/60s for 30fps (or 1/50s for 25fps)

#### Audio

- [ ] External microphone connected
- [ ] Monitor audio levels (avoid clipping)
- [ ] Test audio before recording

#### Setup

- [ ] Eye level or slightly above
- [ ] Rule of thirds applied
- [ ] Clean, uncluttered background
- [ ] Tripod or stable surface

---

## 🎬 Post-Production Guidelines

### Editing Software

**Free Options:**
- DaVinci Resolve (Professional, cross-platform)
- Shotcut (Cross-platform)
- OpenShot (Cross-platform)
- iMovie (Mac/iOS)
- CapCut (Mobile)

**Paid Options:**
- Final Cut Pro (Mac)
- Adobe Premiere Pro (Cross-platform)

### Export Settings for Web

#### For Intro Videos (Short)

```
Resolution: 1280×720 (720p) or 1920×1080 (1080p)
Frame Rate: 30fps
Codec: H.264 (MP4) + VP9/VP8 (WebM)
Bitrate: 2-3 Mbps
Audio: AAC, 128 kbps, 48kHz
File Format: MP4 and WebM
Target Size: 2-5 MB per 30 seconds
```

#### For Tutorial Videos (Longer)

```
Resolution: 1920×1080 (1080p)
Frame Rate: 30fps (or 60fps if showing screen)
Codec: H.264 (MP4) + VP9 (WebM)
Bitrate: 3-5 Mbps
Audio: AAC, 192 kbps, 48kHz
File Format: MP4 and WebM
Target Size: 10-20 MB per minute
```

### Compression Tools

**Free:**
- HandBrake (Cross-platform, excellent)
- FFmpeg (Command-line, powerful)
- Online: CloudConvert, Clideo

**Paid:**
- Adobe Media Encoder (If using Premiere)

### Post-Production Workflow

1. **Record raw video** (highest quality available)
2. **Transfer to computer**
3. **Edit content:**
   - Remove mistakes/pauses
   - Add titles/overlays
   - Color correction (match BitMinded aesthetic)
   - Audio normalization/cleaning
4. **Export in two formats:**
   - WebM (VP9 codec) — smaller files
   - MP4 (H.264 codec) — universal compatibility
5. **Create poster image** (thumbnail frame)
6. **Compress if needed** (target bitrates above)

### HandBrake Settings

#### For Intro Videos

```
Preset: Web/Google Gmail Large 3 Minutes 720p30
Resolution: 1280×720 (or 1920×1080)
Frame Rate: 30fps (same as source)
Bitrate: 2-3 Mbps
Audio: AAC, 128 kbps
```

#### For Tutorial Videos

```
Preset: Web/YouTube 1080p30
Resolution: 1920×1080
Frame Rate: 30fps (or 60fps)
Bitrate: 4-5 Mbps
Audio: AAC, 192 kbps
```

---

## 💾 Storage & Hosting Strategy

### ⚠️ GitHub Storage Limitations

**Important:** Do **NOT** store large video files directly in GitHub repository.

#### GitHub Limits

- **Individual File Size Limit**: 100 MB per file
- **Repository Size Recommendation**: Under 1 GB total
- **Cloudflare Pages Build Limit**: 500 MB (free tier)

#### Problems with Storing Videos in GitHub

If you have:
- 1 intro video: ~5 MB
- 5 tutorial videos: ~250-500 MB
- **Total: 255-505 MB+**

This would:
1. Make repository very large
2. Slow down git operations (clone, pull, push)
3. Hit Cloudflare Pages' 500 MB build limit
4. Waste bandwidth unnecessarily

### ✅ Recommended: Supabase Storage

**Use Supabase Storage for all video files** (similar to your existing `products` bucket).

#### Benefits

- ✅ Already integrated in your codebase
- ✅ No GitHub repository bloat
- ✅ Better performance (CDN-backed)
- ✅ Easier to manage and update videos
- ✅ Scales with your needs
- ✅ No build time impact

#### Recommended Structure

```
Supabase Storage
└── videos/
    ├── intro/
    │   ├── introduction-dark.webm
    │   ├── introduction-dark.mp4
    │   └── introduction-poster.jpg
    └── tutorials/
        ├── getting-started-part1.webm
        ├── getting-started-part1.mp4
        └── ...
```

#### What to Store Where

**In GitHub (Small Files Only):**
- Video configuration (titles, URLs, metadata)
- Poster/thumbnail images (< 1 MB)
- Code that references videos

**In Supabase Storage (Actual Videos):**
- All video files (WebM and MP4)
- Larger poster images
- Any file > 5 MB

### Storage Comparison

| Aspect | GitHub Repository | Supabase Storage |
|--------|-------------------|------------------|
| File size limit | 100 MB per file | Configurable (recommend 100 MB) |
| Repository size impact | Counts toward repo size | None |
| Build time impact | Slows builds | No impact |
| Performance | Via GitHub CDN | Via Supabase CDN |
| Updates | Git commit/push | Upload via dashboard/API |
| Bandwidth | Limited | More generous |
| Cost | Free (with limits) | Free tier available |

---

## 📊 Video Types & Specifications

### 1. Introduction/Hero Videos

**Purpose:** Welcome visitors and establish personal connection

**Specifications:**
- **Duration**: 15-60 seconds
- **Resolution**: 1080p (1920×1080) or 720p
- **Frame Rate**: 30fps
- **Aspect Ratio**: 16:9 (or 9:16 for mobile-first)
- **Style**: Talking head or establishing shot
- **File Size Target**: 2-5 MB for 30 seconds

**Post-Production Target:**
- Formats: WebM (primary) + MP4 (fallback)
- Bitrate: 2-3 Mbps
- Resolution: 1080p or 720p (720p often sufficient)

**Content Tips:**
- Brief introduction of yourself
- Welcome message
- Key value proposition
- Call to action

### 2. Tutorial Videos

**Purpose:** Step-by-step guides and how-to content

**Specifications:**
- **Duration**: 3-10 minutes (flexible)
- **Resolution**: 1080p (1920×1080)
- **Frame Rate**: 30fps (60fps if showing screen recordings or fast UI)
- **Aspect Ratio**: 16:9
- **File Size Target**: 50-100 MB for 5 minutes (10-20 MB/minute)

**Post-Production Target:**
- Formats: WebM + MP4
- Bitrate: 3-5 Mbps
- Resolution: 1080p for clarity (720p acceptable if file size is concern)

**Content Tips:**
- Clear step-by-step structure
- Pause between steps for clarity
- Zoom-in on important UI elements
- Add text overlays for key points
- Include chapter markers for longer tutorials

**Screen Recording Considerations:**
- Use screen recording software for computer screen
- Overlay your face in corner (Picture-in-Picture)
- 60fps helps with screen clarity
- Ensure text is readable at 1080p

### 3. Product Demo Videos

**Purpose:** Showcase features and capabilities

**Specifications:**
- **Duration**: 1-3 minutes
- **Resolution**: 1080p
- **Frame Rate**: 30fps or 60fps
- **File Size Target**: 10-30 MB for 2 minutes

**Content Tips:**
- Focus on key features
- Show real use cases
- Keep it concise and engaging

### 4. Testimonial Videos

**Purpose:** Build trust through customer stories

**Specifications:**
- **Duration**: 1-2 minutes
- **Resolution**: 1080p
- **Frame Rate**: 30fps
- **File Size Target**: 10-20 MB

**Content Tips:**
- Authentic, natural conversation
- Clear audio is critical
- Good lighting and framing

### File Size Guidelines

| Video Type | Duration | Target File Size | Max File Size |
|------------|----------|------------------|---------------|
| Intro | 15-60 sec | 2-5 MB | 10 MB |
| Short Tutorial | 2-5 min | 20-50 MB | 100 MB |
| Long Tutorial | 5-10 min | 50-100 MB | 200 MB |
| Demo | 1-3 min | 10-30 MB | 50 MB |

---

## 🔧 Technical Implementation

### Video Component Structure

Following BitMinded component patterns:

```
components/
  └── hero-video/
      ├── hero-video.html
      ├── hero-video.css
      ├── hero-video.js
      └── locales/
          └── hero-video-locales.json
```

### HTML5 Video Element

```html
<video 
    id="hero-video" 
    class="hero__video" 
    autoplay 
    muted 
    loop 
    playsinline
    poster="videos/intro/introduction-poster.jpg">
    <source src="videos/intro/introduction-dark.webm" type="video/webm">
    <source src="videos/intro/introduction-dark.mp4" type="video/mp4">
    <!-- Fallback to image if video doesn't load -->
    <img src="icons/here-header-dark.jpeg" alt="BitMinded - Handcrafted Software">
</video>
```

### Theme-Aware Video Loading

Similar to `hero-image.js`, create `hero-video.js`:

```javascript
// Hero video theme sync
(function () {
    function setHeroVideoForTheme(theme) {
        const video = document.getElementById('hero-video');
        if (!video) return;
        
        const webmSrc = theme === 'light' 
            ? 'videos/intro/introduction-light.webm' 
            : 'videos/intro/introduction-dark.webm';
        const mp4Src = theme === 'light' 
            ? 'videos/intro/introduction-light.mp4' 
            : 'videos/intro/introduction-dark.mp4';
        
        // Update source elements
        const sources = video.querySelectorAll('source');
        if (sources.length >= 2) {
            sources[0].src = webmSrc; // WebM first (better compression)
            sources[1].src = mp4Src;  // MP4 fallback
        }
        
        // Reload video to pick up new sources
        video.load();
    }
    
    function getTheme() {
        const t = document.documentElement.getAttribute('data-theme');
        return t === 'light' ? 'light' : 'dark';
    }
    
    document.addEventListener('DOMContentLoaded', function () {
        setHeroVideoForTheme(getTheme());
    });
    
    window.addEventListener('themeChanged', function (e) {
        setHeroVideoForTheme(e.detail && e.detail.theme ? e.detail.theme : getTheme());
    });
})();
```

### CSS Styling

Add to `css/homepage.css`:

```css
/* Hero Video Styles */
.hero__video {
    width: 100%;
    max-width: 600px;
    height: auto;
    margin: 0 auto var(--spacing-xl);
    display: block;
    border-radius: var(--radius-lg);
    object-fit: cover;
    box-shadow: var(--shadow-lg);
}

/* Hide video initially if using delayed approach */
.hero__video--hidden {
    display: none;
}
```

### Supabase Storage Setup

Create a `videos` bucket in Supabase (similar to existing `products` bucket):

**SQL Migration:**

```sql
-- Create the videos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'videos',
    'videos',
    true, -- Public bucket so we can access video URLs directly
    104857600, -- 100MB file size limit (enough for videos)
    ARRAY[
        'video/webm',
        'video/mp4',
        'video/mpeg',
        'image/jpeg',
        'image/jpg',
        'image/png'
    ]
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the videos bucket

-- Admins can upload videos
CREATE POLICY "Admins can upload videos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'videos' 
        AND EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Anyone can view videos (since it's a public bucket)
CREATE POLICY "Anyone can view videos" ON storage.objects
    FOR SELECT USING (bucket_id = 'videos');
```

---

## 🌍 Multi-Language Considerations

Since BitMinded uses i18next (EN/FR/DE/ES), consider:

### Option 1: Separate Videos Per Language

```
videos/
  └── intro/
      ├── introduction-en.webm
      ├── introduction-en.mp4
      ├── introduction-fr.webm
      ├── introduction-fr.mp4
      └── ...
```

**Pros:**
- Full localization (can speak in each language)
- More personal connection

**Cons:**
- More storage space
- More production time

### Option 2: Single Video with Subtitles

- Single video file
- WebVTT subtitle tracks for each language
- More storage-efficient

**Implementation:**
```html
<video>
    <source src="videos/intro/introduction.webm" type="video/webm">
    <track kind="subtitles" src="videos/intro/subtitles-en.vtt" srclang="en" label="English">
    <track kind="subtitles" src="videos/intro/subtitles-fr.vtt" srclang="fr" label="Français">
    <track kind="subtitles" src="videos/intro/subtitles-de.vtt" srclang="de" label="Deutsch">
    <track kind="subtitles" src="videos/intro/subtitles-es.vtt" srclang="es" label="Español">
</video>
```

---

## ⚡ Performance & Optimization

### Loading Strategy

1. **Lazy Loading**: Load videos only when needed
2. **Progressive Loading**: Start playback while downloading
3. **Quality Selection**: Offer 720p/1080p options for tutorials
4. **Preload Strategy**:
   - Intro videos: `preload="metadata"` (just poster)
   - Tutorial videos: `preload="none"` (load on demand)

### Mobile Considerations

- Use `playsinline` attribute (already in example)
- Test on mobile networks
- Consider serving lower resolution on mobile
- Optimize for mobile data usage

### Autoplay Rules

- Must be `muted` to autoplay
- Mobile browsers have stricter autoplay policies
- Consider showing play button for user-initiated playback

### SEO & Accessibility

- Add poster image (thumbnail shown while loading)
- Include captions/subtitles if needed
- Provide image fallback for video
- Consider `aria-label` for screen readers
- Add video schema markup for SEO

### Cloudflare Pages Considerations

- Free tier: 500MB build size limit
- Large videos: Use Supabase Storage (not in build)
- CDN: Cloudflare automatically serves videos through their CDN when stored properly

---

## 📝 Quick Reference Checklist

### Before Filming

- [ ] Battery charged or plugged in
- [ ] Storage space available
- [ ] Do Not Disturb enabled
- [ ] Lens cleaned
- [ ] Audio tested
- [ ] Lighting checked
- [ ] Framing checked
- [ ] Background reviewed
- [ ] Camera/phone stabilized

### Filming Settings

- [ ] Resolution: 1080p at 30fps
- [ ] HDR: OFF
- [ ] Stabilization: ON
- [ ] Audio: External mic (if available)
- [ ] Exposure: Locked

### Post-Production

- [ ] Edit and clean up footage
- [ ] Export as WebM and MP4
- [ ] Create poster image
- [ ] Compress to target file sizes
- [ ] Test playback

### Upload & Hosting

- [ ] Upload to Supabase Storage (NOT GitHub)
- [ ] Create poster/thumbnail
- [ ] Update video URLs in code
- [ ] Test on website
- [ ] Check mobile playback

---

## 🎯 Summary: Key Takeaways

1. **Resolution**: 1080p (1920×1080) at 30fps
2. **Audio**: Use external microphone when possible
3. **Lighting**: Even, diffused light on your face
4. **File Size**: Keep intros under 5MB, tutorials 10-20MB/minute
5. **Formats**: Provide both WebM (primary) and MP4 (fallback)
6. **Duration**: Intro 15-60 sec, tutorials as needed
7. **Storage**: Use Supabase Storage (NOT GitHub) for all video files
8. **Organization**: Clear folder structure (`videos/intro/`, `videos/tutorials/`)

---

## 📚 Additional Resources

### Video Compression Tools
- **HandBrake**: https://handbrake.fr/ (Free, cross-platform)
- **FFmpeg**: https://ffmpeg.org/ (Command-line, powerful)

### Video Editing Software
- **DaVinci Resolve**: https://www.blackmagicdesign.com/products/davinciresolve (Free, professional)
- **Shotcut**: https://shotcut.org/ (Free, cross-platform)

### Learning Resources
- Video production best practices
- iPhone filming tutorials
- Screen recording guides

---

*This guide is a living document. Update as you learn and refine your video production process.*

