# Profile Preview Integration Guide

## Overview
Hover profile previews (virtual media kits) are now ready to integrate everywhere in the app. Any creator/brand name or avatar should show a preview card on hover.

## Components Built

### 1. `ProfilePreviewCard` 
Shows the actual preview card on hover.

### 2. `useProfilePreview` Hook
Manages hover state with 300ms delay to prevent flickering.

### 3. `ProfileLink` 
Drop-in wrapper that combines both for easy integration.

## How to Use

### Replace any creator/brand name with ProfileLink:

```tsx
import ProfileLink from '@/components/ProfileLink';

// Before:
<span onClick={() => router.push(`/creator/${creatorId}`)}>
  {creatorName}
</span>

// After:
<ProfileLink
  type="creator"
  id={creatorId}
  name={creatorName}
  avatar={avatarUrl}
  followerCount={followers}
  engagementRate={engagement}
  niche={niche}
  dealsCount={pastDeals}
  href={`/creator/${creatorId}`}
/>
```

### For brands:
```tsx
<ProfileLink
  type="brand"
  id={brandId}
  name={brandName}
  avatar={logoUrl}
  category={category}
  dealsCount={activeCampaigns}
  href={`/brand/${brandId}`}
/>
```

## Pages to Update (Priority Order)

### CRITICAL (Negotiation & Acceptance)
- [ ] `/pages/deals/[dealId].tsx` - Deal room (show creator & brand names)
- [ ] `/components/DealRoomChat.tsx` - Messages (show sender names)
- [ ] `/features/marketplace/demo/views/MessagesView.tsx` - Messaging page

### HIGH (Profiles & Discovery)
- [ ] `/features/creator-profile/` - Creator profile pages
- [ ] `/features/brand/` - Brand profile pages
- [ ] `/features/marketplace/demo/views/ExploreView.tsx` - Creator listings
- [ ] `/features/marketplace/demo/views/NotificationsView.tsx` - Notification creators/brands

### MEDIUM (Campaigns & Deals)
- [ ] `/features/campaigns/CampaignDetail.tsx` - Show brand info
- [ ] `/features/campaigns/CampaignList.tsx` - Show brand names
- [ ] Deal feed pages

### LOW (Admin & Settings)
- [ ] Settings pages
- [ ] Analytics/stats pages

## Implementation Checklist

When updating each page:

1. Import ProfileLink at top:
   ```tsx
   import ProfileLink from '@/components/ProfileLink';
   ```

2. Find all creator/brand name displays

3. Replace with ProfileLink component

4. Pass required props:
   - `type` ("creator" or "brand")
   - `id` (creator_id or brand_id)
   - `name` (display name)
   - `href` (link to profile)
   - Stats props (followers, engagement, etc.)

5. Test hover behavior on localhost

## Data to Pass

### For Creators
- `followerCount` - Instagram followers
- `engagementRate` - Calculated engagement %
- `niche` - Creator's niche/category
- `dealsCount` - Number of completed deals

### For Brands
- `category` - Brand industry/category
- `dealsCount` - Active campaigns or total deals

## Notes

- The preview card appears after 300ms hover (no flickering on quick mouseovers)
- Card positions near the element being hovered
- Clicking the name navigates to the full profile
- Preview works everywhere: deal negotiation, messages, feeds, profiles, etc.
- Fully responsive and theme-aware (dark/light mode)

## Next Steps

1. Start with Deal page (`/pages/deals/[dealId].tsx`)
2. Update Messages (most important for UX)
3. Roll out to all other pages systematically

This should be done comprehensively so there's no "Media Kit" moment - every profile is instantly accessible.
