## KEY FEATURES IMPLEMENTED:

1. ✅ USER SYSTEM
    - Authentication (Email, Google, Apple)
    - Profile management
    - Cap level progression system
    - User metrics and activity tracking

2. ✅ CONTENT SYSTEM
    - Posts with rich media support
    - Comments with nested replies
    - Like/Share system
    - 10 content categories structure ready
    - Trending topics tracking

3. ✅ CAP SYSTEM
    - 5 cap levels (Green → Yellow → Red → Black → Ostrich Feather)
    - Ad revenue sharing based on cap level
    - Requirements tracking for each level

4. ✅ VOLUNTEER HUB
    - Project creation and management
    - Application system
    - Endorsement system
    - Hours tracking for cap progression

5. ✅ COMMUNITY SYSTEM
    - Community creation and management
    - Membership roles
    - Community profiles and about pages

6. ✅ NGO SYSTEM
    - NGO profiles and verification
    - Project posting capabilities
    - Integration with volunteer hub

7. ✅ MARKETPLACE
    - Product listings with categories
    - Order management
    - Wishlist functionality

8. ✅ CHAT SYSTEM
    - Direct and group messaging
    - Message read receipts
    - File sharing support

9. ✅ MONETIZATION
    - Ad revenue sharing
    - Creator subscriptions
    - Payout management
    - Corporate memberships

10. ✅ MODERATION
    - Report system
    - Ban management
    - Content moderation tools

## PERFORMANCE CONSIDERATIONS:

- All major query patterns have indexes
- Denormalized counters for better performance
- Proper cascading deletes to maintain data integrity
- Unique constraints to prevent duplicates

## Docker run

- docker compose --profile dev up -d
