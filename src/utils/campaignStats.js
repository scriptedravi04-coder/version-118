/**
 * Utility to calculate consistent, realistic campaign view and applied counts.
 * Keeps counts strictly within 10-15 as requested, with natural variations (2, 3, 4, 5, etc.)
 * and dynamic avatar counts matching the applied number.
 */
export function getCampaignStats(campaign) {
  if (!campaign) return { views: 12, applied: 3 };
  
  const idStr = String(campaign.campaign_id || campaign.id || campaign.title || "campaign");
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash << 5) - hash + idStr.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  // Natural variation for applied (2, 3, 4, 5)
  const baseApplied = 2 + (posHash % 4); // 2, 3, 4, 5
  let applied = baseApplied;

  if (Array.isArray(campaign.applicants) && campaign.applicants.length > 1) {
    applied = Math.min(8, Math.max(baseApplied, campaign.applicants.length));
  } else if (typeof campaign.applied === 'number' && campaign.applied > 1 && campaign.applied <= 15) {
    applied = campaign.applied;
  }

  // Views strictly between 10 and 15 (always greater than applied)
  let views = Math.min(15, Math.max(10, 10 + (posHash % 6)));
  if (views <= applied) {
    views = applied + 5;
  }

  return { views, applied };
}

/**
 * Returns avatars matching the number of applicants (e.g. 2 for 2, 3 for 3, 4 for 4+)
 */
export function getCampaignAvatars(campaign, count = 2) {
  const numAvatars = Math.min(Math.max(2, Number(count) || 2), 4);
  const idStr = String(campaign?.campaign_id || campaign?.id || campaign?.title || "camp");
  
  const avatars = [];
  for (let i = 1; i <= numAvatars; i++) {
    avatars.push(`https://i.pravatar.cc/100?u=${idStr}_avatar_${i}`);
  }
  return avatars;
}
