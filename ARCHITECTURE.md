# Ybex — Campaign vs UGC

Read this before touching anything in chat, escrow or the deal lifecycle.

## The one thing that causes bugs here

Ybex runs two products through a lot of the same code:

| | Campaign | Instant UGC |
|---|---|---|
| What it is | A brand runs a campaign; creators apply; a deal is signed | A brand orders a video directly from a creator |
| Record | `deals` row | `ugc_orders` row |
| Identifier | UUID, e.g. `3f2b…-…` | prefixed string, e.g. `ugcord_1773…` |
| Has a signature stage | yes | no |
| Chat thread id | `thread_camp_…` or a UUID | `thread_ugc_…` |

Both of these were historically stored in the **same column**: `chat_threads.deal_id`. So a
`deal_id` may hold a campaign UUID or a UGC order string, and code that assumed one got the
other. That single ambiguity is behind a long run of bugs — Supabase `22P02` errors from
passing `ugcord_…` where a UUID was expected, UGC orders silently updating the `deals`
table, revision state landing on the wrong record.

## The identifiers to use

- **`campaign_deal_id`** — set only on campaign threads. Always a UUID or `null`.
- **`ugc_order_id`** — set only on UGC threads.
- **`deal_id`** — legacy, still populated for both. Hundreds of call sites read it, so it
  has not been removed. **Do not use it in new code to decide which flow you are in.**

`populateThreadData` in `backend/server.ts` sets `campaign_deal_id` and `ugc_order_id`, plus
`is_ugc`, `type` and `deal_type`.

## How to tell which flow you are in

Do not pattern-match on the string. Use the flags the serializer already gives you:

```ts
const isUgc = Boolean(
  thread.is_ugc || thread.ugc_order_id ||
  String(thread.deal_type || '').toUpperCase() === 'UGC'
);
```

When you only have a raw id, check for the `ugcord_` / `thread_ugc_` prefix, and validate
the UUID shape before sending anything to a Supabase UUID column:

```ts
const isUuid = (v: any) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
```

## Rules

1. **Never write a UGC id into a UUID column.** Guard with `isUuid` first. An unguarded
   write fails the whole statement, not just that row.
2. **Decide by what the thread IS, not by what you could prove.** Gating a UGC write on
   "did the order row resolve" means the write is skipped exactly when resolution failed —
   which is when it mattered. Gate on `isCampaignThread` instead, and let UGC be the
   default. See `syncUgcLifecycleEvent`.
3. **Campaign code is under a freeze.** Do not modify `backend/campaigns_routes.ts`,
   `backend/admin_campaigns_settings_routes.ts`, `src/pages/brand/BrandCampaign*.jsx`,
   `src/pages/creator/CreatorCampaignFlow.jsx` or `src/components/campaigns/` without
   explicit sign-off.
4. **Shared files must branch, not switch.** `server.ts`, `ChatBox.jsx`, `SystemMessage.jsx`,
   `MessageBubble.jsx`, `ContentProofNotice.jsx` and `deals_chat_routes.ts` serve both
   flows. Changes go inside a UGC-only or campaign-only branch, leaving the other path
   byte-identical.
5. **Order your state checks carefully.** A revision request updates the thread immediately
   but the order row can lag. If "content submitted" is allowed to win that tie, the UI
   sticks on the old state. See `src/components/chat/chatFlowState.js`.

## Database

`campaign_deals` is a view over `deals`, added so the campaign table can be referred to by
a name that says what it is. The underlying table is unchanged and both names work.

`chat_threads.campaign_deal_id` and `transactions.campaign_deal_id` are nullable UUID
columns. Backfilled only where the existing `deal_id` is a valid UUID; UGC rows are left
`NULL` deliberately. Readers fall back to `deal_id` when it is `NULL`.

Migration to run if these are not yet present:

```sql
ALTER TABLE IF EXISTS chat_threads ADD COLUMN IF NOT EXISTS campaign_deal_id UUID;
ALTER TABLE IF EXISTS transactions  ADD COLUMN IF NOT EXISTS campaign_deal_id UUID;

UPDATE chat_threads SET campaign_deal_id = deal_id::UUID
 WHERE campaign_deal_id IS NULL AND deal_id IS NOT NULL
   AND deal_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- The UUID guard matters here too. transactions.deal_id can hold a ugcord_ string, and
-- without the filter the whole statement fails on the first one.
UPDATE transactions SET campaign_deal_id = deal_id::UUID
 WHERE campaign_deal_id IS NULL AND deal_id IS NOT NULL
   AND deal_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

CREATE INDEX IF NOT EXISTS idx_chat_threads_campaign_deal_id ON chat_threads(campaign_deal_id);
CREATE INDEX IF NOT EXISTS idx_transactions_campaign_deal_id ON transactions(campaign_deal_id);

CREATE OR REPLACE VIEW campaign_deals AS SELECT * FROM deals;
```

## Fees

The brand is charged **no platform fee**. Escrow holds the full agreed amount and the
commission is taken from the creator's side at payout. Brand-facing screens therefore show
`Brand Fee: ₹0` — this is a display change only; `calculatePlatformFee` and the amounts
written to `transactions` are untouched.

## Chat contact filter

`backend/contactSecurityFilter.ts` blocks attempts to move a deal off-platform. It is
enforced on the server; `src/utils/contactSecurityFilter.js` re-exports the same module so
the UI can warn instantly, but the client is never the barrier.

Contact keywords do **not** block on their own — only when they appear near something
contact-shaped. "Is this for iPhone or Android?" must keep working. Revision notes and
briefs are exempt entirely, so a brand can ask a creator to keep a phone out of frame.

## Route Separation & Lifecycle Handlers (Phases A–D)

Campaign and UGC lifecycle execution are split into dedicated modules with discrete namespaces:

1. **Campaign Namespace (`/campaign/threads/*`)**:
   - Handled by `createCampaignLifecycleHandlers` in `backend/campaigns_routes.ts`.
   - Manages campaign content approvals (`approve-content`), draft submission (`submit-content`), live link submissions (`submit-live-link`), live links approval (`approve-live-links` / `mark-complete`), revisions (`request-revision` / `reject-content`), and cancellations (`cancel-order`).
   - Wired via `setupCampaignThreadRoutes`.

2. **UGC Namespace (`/ugc/threads/*` & `/ugc/orders/*`)**:
   - Handled by `createUgcLifecycleHandlers` and `setupUgcOrderRoutes` in `backend/ugc_routes.ts`.
   - Manages raw deliverable submissions (`submit` / `submit-content`), instant order approval & payout release (`approve` / `mark-complete`), revisions, decline revisions, and order claims cancellation.

3. **Thin Forwarders & Legacy Compatibility**:
   - Legacy `/chat/v2/threads/*` endpoints in `backend/server.ts` are thin forwarders that resolve the thread and dispatch to either the UGC or Campaign lifecycle handler using `isUgcThread(thread)`.

