# Where does my change go?

Read this before editing anything. Read `ARCHITECTURE.md` too — it explains *why* Campaign
and UGC keep colliding. This file is the shorter question: **which file do I touch?**

---

## Before you commit, run this

```bash
npm run verify
```

That is `tsc --noEmit` + the crash guard + the test suite. All three must pass.

**`npm run build` succeeding proves nothing.** It does not typecheck and it does not catch a
component used without being imported. Two bugs have reached production through a green
build: an undeclared `targetBrandId` that killed the payout chat card, and an unimported
`<AlertCircle />` that white-screened the creator's revision page. `npm run verify` catches
both. `npm run build` catches neither.

---

## Which file?

| I'm changing… | Edit | Never touch |
|---|---|---|
| Campaign flow only | `backend/campaigns_routes.ts`, `src/pages/brand/BrandCampaign*.jsx`, `src/pages/creator/CreatorCampaignFlow.jsx`, `src/components/campaigns/` | anything UGC |
| UGC flow only | `backend/ugc_routes.ts`, `src/pages/brand/BrandUGC*.jsx`, `src/pages/creator/*UGC*.jsx` | anything campaign |
| "Is this UGC or Campaign?" | `backend/dealFlow.ts` — **the only place** | do not write the check inline |
| Chat contact filtering | `backend/contactSecurityFilter.ts` | do not add a second filter |
| Chat review-state order | `src/components/chat/chatFlowState.js` | do not inline the precedence |
| Negotiation signature lock | `negotiationLockedFor` in `backend/deals_chat_routes.ts` | — |
| Showing money, or any API value | `src/utils/safeFormat.js` helpers | `.toLocaleString()` on API data |

### Campaign is frozen

Campaign works. Do not modify campaign files without explicit sign-off from Ravi, **for that
specific change**. "While I was in there" is not sign-off.

---

## The four rules that would have prevented every bug so far

### 1. Never decide the flow inline

```js
// NO — this is how the inbox and the chat screen ended up disagreeing
const isUgc = thread.is_ugc || thread.deal_type === 'UGC' || thread.ugc_order_id;

// YES
import { isUgcThread, isCampaignThread } from "@/utils/dealFlow";
```

There were six inline copies of that check and they all differed. One of them did not test
the `ugcord_` prefix, so a UGC thread appeared under **Campaigns** in the inbox while the
chat screen treated the same row as UGC. `is_ugc` is not reliably set in the database, so
any check that trusts it alone is wrong.

If detection needs to change, change `dealFlow.ts`. Both flows stay in agreement by
construction.

### 2. Never send a UGC id to a UUID column

Campaign ids are UUIDs. UGC ids look like `ugcord_mu6hn57v_1f7434`. They shared the
`deal_id` column for a long time, so both still turn up there.

```js
// NO — Postgres 22P02, and it fails the WHOLE statement, not just this row
await supabase.from('deals').update({...}).eq('id', thread.deal_id);

// YES
import { getCampaignDealId } from "@/utils/dealFlow";
const dealId = getCampaignDealId(thread);   // UUID or null, never a ugcord_ string
if (dealId) await supabase.from('deals').update({...}).eq('id', dealId);
```

### 3. Never call a method directly on API data

```jsx
// NO — one missing field and the page is gone
₹{order.amount.toLocaleString('en-IN')}
{status.toUpperCase()}
{deal.dos.map(...)}

// YES
import { formatAmount, safeUpper, safeArray } from "@/utils/safeFormat";
₹{formatAmount(order.amount)}
{safeUpper(status)}
{safeArray(deal.dos).map(...)}
```

`undefined.toLocaleString()` throws a TypeError, React cannot recover mid-render, and the
page dies. The escrow release modal had ten of these. A missing amount should render as ₹0
and look obviously wrong — not blank the screen.

Same for `JSON.parse` on anything from `localStorage`: use `safeJsonParse`. A corrupt cached
user in `AuthContext` used to throw above the router, where no boundary could catch it, and
the app simply would not start.

### 4. Branch on what it IS, not on what you managed to prove

```js
// NO — isUgc goes false exactly when the order row failed to load, which is when the
// write mattered most. This silently skipped Manage Orders updates for real UGC orders.
if (isUgc || order) { updateUgcOrder(); } else { updateDeal(); }

// YES — decide from the thread, and let UGC be the default
if (isCampaignThread(thread)) { updateDeal(); } else { updateUgcOrder(); }
```

---

## Shared files: branch, don't switch

These serve both flows and cannot simply be split:

`backend/server.ts` · `backend/deals_chat_routes.ts` · `src/components/chat/ChatBox.jsx` ·
`ContentProofNotice.jsx` · `SystemMessage.jsx` · `MessageBubble.jsx`

Editing one of these is the highest-risk change in the codebase — it is how a campaign fix
broke UGC and vice versa, repeatedly. So:

- Put the change inside an `if (isUgcThread(...))` / `if (isCampaignThread(...))` branch.
- Leave the other branch **byte-identical**. Do not reformat it, do not reorder it.
- **Reordering conditions counts as changing them.** Flipping which of
  `isContentSubmitted` / `isRevisionRequested` is evaluated first broke the entire UGC
  revision flow without changing a single condition's contents.
- Test both flows before committing, not just the one you were fixing.

---

## Adding a regression test

Every bug fix gets a test, and the test must be proven to work:

1. Write the fix.
2. Write the test. Confirm it passes.
3. **Undo the fix. Confirm the test fails.** A test that passes either way is worthless.
4. Redo the fix. Confirm it passes again.

For a filter or a classifier, also test the **negative** side — what must *not* be blocked,
what must *not* be reclassified. The contact filter's first draft blocked
"budget is 3500 for 2 reels" and "Is this for iPhone or Android?"; only the negative tests
caught that.

---

## Working with AI Studio

- After any AI Studio round-trip, run `npm run verify` before trusting anything.
- A summary of what changed is not evidence. Grep for a literal string from the code.
- If the exported zip does not contain the changes, the work was never committed — check
  `git status -s` and `git log --oneline -n 2`.
