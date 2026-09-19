const fs = require('fs');

let content = fs.readFileSync('backend/server.ts', 'utf8');

const oldLogic = `    const db = getDb();
    const thread = (db.chat_threads || []).find((t: any) => t.id === id || t.deal_id === id);

    const isCampaignDealThread = Boolean(
      !thread?.is_ugc &&
      thread?.deal_type !== 'UGC' &&
      ((typeof id === 'string' && id.startsWith('thread_camp_')) ||
      (thread?.id && String(thread.id).startsWith('thread_camp_')) ||
      thread?.deal_id ||
      thread?.campaign_id)
    );

    const isLiveLinkApproval = Boolean(
      req.body?.action === 'approve_live_links' ||
      req.body?.action === 'approve_deliverable' ||
      thread?.flow_state === 'PROOF_SUBMITTED' ||
      thread?.live_links_submitted
    );

    if (isCampaignDealThread || isLiveLinkApproval) {
      return handleThreadApproveLiveLinks(req, res);
    }`;

const newLogic = `    const db = getDb();
    const thread = (db.chat_threads || []).find((t: any) => t.id === id || t.deal_id === id);

    const isUgcOrder = Boolean(
      thread?.is_ugc || 
      thread?.deal_type === 'UGC' ||
      (typeof id === 'string' && id.startsWith('ugcord_')) ||
      (thread?.deal_id && String(thread.deal_id).startsWith('ugcord_')) ||
      (thread?.id && String(thread.id).startsWith('ugcord_'))
    );

    const isCampaignDealThread = Boolean(
      ((typeof id === 'string' && id.startsWith('thread_camp_')) ||
      (thread?.id && String(thread.id).startsWith('thread_camp_')) ||
      thread?.deal_id ||
      thread?.campaign_id)
    );

    const isLiveLinkApproval = Boolean(
      req.body?.action === 'approve_live_links' ||
      req.body?.action === 'approve_deliverable' ||
      thread?.flow_state === 'PROOF_SUBMITTED' ||
      thread?.live_links_submitted
    );

    if (!isUgcOrder && (isCampaignDealThread || isLiveLinkApproval)) {
      return handleThreadApproveLiveLinks(req, res);
    }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('backend/server.ts', content);
