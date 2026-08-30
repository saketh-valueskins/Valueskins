/**
 * Niche-based deal notifications
 * When a brand posts a deal, notify all creators in that niche
 */

export interface NicheNotification {
  id: string;
  creatorId: string;
  dealId: number;
  dealTitle: string;
  brandName: string;
  niche: string;
  budget: number;
  deadline: string;
  timestamp: string;
  read: boolean;
  viewed: boolean;
}

/**
 * Send notification to all creators in a specific niche when a deal is posted
 * Called when brand creates a new campaign/deal
 */
export async function notifyCreatorsByNiche(
  dealId: number,
  dealTitle: string,
  brandName: string,
  niche: string,
  budget: number,
  deadline: string
): Promise<NicheNotification[]> {
  try {
    // In production, this would:
    // 1. Query database for all creators with matching niche
    // 2. Create notification record for each creator
    // 3. Send web push notification via Supabase
    // 4. Send real-time notification via WebSocket

    const notifications: NicheNotification[] = [];

    // Step 1: Get all creators in this niche from database
    const response = await fetch('/api/creators/by-niche', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche }),
    });

    if (!response.ok) {
      console.error('Failed to fetch creators by niche');
      return [];
    }

    const { creators } = await response.json();

    // Step 2: Create notification for each creator
    for (const creator of creators) {
      const notification: NicheNotification = {
        id: `notif_${dealId}_${creator.id}_${Date.now()}`,
        creatorId: creator.id,
        dealId,
        dealTitle,
        brandName,
        niche,
        budget,
        deadline,
        timestamp: new Date().toISOString(),
        read: false,
        viewed: false,
      };

      notifications.push(notification);

      // Step 3: Store notification in database
      await fetch('/api/notifications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });

      // Step 4: Send web notification via Supabase real-time
      // This will appear in the NotificationsView component
      await notifyCreatorWebSocket(creator.id, notification);
    }

    console.log(`✓ Sent ${notifications.length} notifications to creators in ${niche} niche`);
    return notifications;
  } catch (error) {
    console.error('Error sending niche notifications:', error);
    return [];
  }
}

/**
 * Send real-time web notification via Render WebSocket
 */
async function notifyCreatorWebSocket(creatorId: string, notification: NicheNotification) {
  try {
    // Use Render WebSocket for real-time notifications
    // Broadcast to creator's WebSocket connection with deal notification

    const response = await fetch('/api/notifications/send-realtime', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorId,
        notification,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending WebSocket notification:', error);
    return false;
  }
}

/**
 * Get unread notification count for a creator
 */
export async function getUnreadNotificationCount(creatorId: string): Promise<number> {
  try {
    const response = await fetch(`/api/notifications/unread-count?creatorId=${creatorId}`);

    if (!response.ok) return 0;

    const { count } = await response.json();
    return count;
  } catch (error) {
    console.error('Error fetching notification count:', error);
    return 0;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    });

    return response.ok;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Get notification message for display
 */
export function getNotificationMessage(notif: NicheNotification): string {
  return `${notif.brandName} posted a new ${notif.niche} deal: "${notif.dealTitle}" (₹${notif.budget})`;
}
