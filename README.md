# QuickStocks

A private, responsive stock-market research workspace, designed for Indian equities and built with React, TypeScript, Tailwind CSS, Express and MongoDB.

**Repository:** https://github.com/sainsg333/Quick-stock

## Features

- **Overview dashboard:** real figures from your saved stocks, strategies, matches, watchlists and trade results. A source-filtered illustrative trade-index curve compounds recorded net returns.
- **Stock Universe:** NSE / BSE ticker profiles with sector, trend, dated recorded price, relative volume, RSI, tags and detailed notes.
- **Strategy Library:** intraday, swing, short-term and long-term strategies with setup, entry, exit, risk rules, market regimes, research maturity and test sample sizes.
- **Strategy × Stock:** map strategies to stock symbols and market regimes, including win rate, net return, drawdown, sample size, out-of-sample status and research verdict.
- **Smart Watchlists:** flexible manually maintained collections for momentum, volume, breakout, reversals and more.
- **Trade & Backtest Log:** backtested, paper and live outcomes, distinguished by source; dashboard statistics generated only from these records.
- **Research Journal:** save dated observations, screenshots *as hosted URLs*, failures, and lessons.
- **CRUD:** create, view, search, filter, sort, edit and delete saved records. Desktop and mobile responsive UI.
- **Private access:** setup-token-protected single-owner registration (new passwords: minimum 12 characters) and sign-in, bcrypt hashing and a 7-day HttpOnly, SameSite=Strict signed JWT cookie.

> **Research only:** QuickStocks is a record-keeping app, not a live market terminal. Prices, indicators, win rates and strategy verdicts are user-recorded, not pulled from exchanges. It neither scans stocks automatically nor executes trades. “Evidence-backed*” is a display heuristic requiring at least 30 user-recorded examples and an out-of-sample checkbox; it is **not proof of an independently verified trading edge**.

## Tech stack

| Component | Technology |
| --- | --- |
| Frontend | Vite, React 18, TypeScript, Tailwind CSS |
| Graphs | Recharts |
| Icons | Lucide React |
| Backend | Express 4 inside Vercel Node function |
| Database | MongoDB Atlas via official Node driver |
| Validation | Zod |
| Authentication | bcryptjs + jose |
| Hosting | Vercel (static frontend + `api/index.ts` function) |

## Run on Windows / local development

Requires Node.js **20 or newer** and access to MongoDB Atlas.

1. Clone the repository:

   ```powershell
   git clone https://github.com/sainsg333/Quick-stock.git
   cd Quick-stock
   npm install
   ```

2. Copy the environment template and configure secrets:

   ```powershell
   Copy-Item .env.example .env
   ```

   In `.env`, set:
   - `MONGODB_URI`: your current MongoDB Atlas connection string.
   - `MONGODB_DB=quickstocks`: name of the database to use.
   - `SETUP_TOKEN`: a **separate random string of 24+ characters** protecting first-time owner registration.
   - `SESSION_SECRET`: a **random string of 32+ characters** (generate e.g. using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

   **Never commit `.env`.** The repository has a `.gitignore` that excludes it. Never create a `VITE_MONGODB_URI` variable, which would expose the database credentials in client-side code.

3. Ensure your IP is allowed in **MongoDB Atlas > Network Access** and your Atlas database user has read/write permissions.

4. Launch both development servers:

   ```powershell
   npm run dev
   ```

   Open **http://localhost:5173**. The Vite dev server forwards `/api` requests to the Express backend at `http://localhost:3001`.

5. First visit: enter your **SETUP_TOKEN** and choose a new workspace password (**12+ characters**). Existing owners continue signing in with their existing passwords; the setup token is not needed to log in.

## Deploy to Vercel

1. In Vercel, **Add New > Project > Import Git Repository** and select **sainsg333/Quick-stock**.
2. Use the repository root directory. Framework preset: **Vite** (auto-detected).
3. Build command: `npm run build`; output directory: `dist`. These are also specified in `vercel.json`.
4. Add these **server-side** Vercel Environment Variables for Production (and Preview if required):
   - `MONGODB_URI`: Atlas MongoDB connection string.
   - `MONGODB_DB`: `quickstocks`.
   - `SESSION_SECRET`: long random secret, **at least 32 characters**.
   - `SETUP_TOKEN`: **a different secret**, **at least 24 characters**, required for first-time workspace setup.
5. Make sure Atlas **Network Access** accepts connections from the deployment network. Vercel functions generally use dynamic outbound IP addresses unless configured for static egress. Avoid unrestricted access where possible; if you temporarily permit `0.0.0.0/0`, use strong, least-privilege database credentials, monitor access, and tighten this policy.
6. Deploy. Visit your `*.vercel.app` address, then enter your setup token and configure the single-owner password.

**Important first-run caution:** The first person who knows the **SETUP_TOKEN** and registers becomes the sole owner. Keep both server secrets private, and restrict deployment access until you finish setup. If your workspace is already configured, adding the token does not reset the owner.

For verification:
- `/api/health` returns `{"ok":true,"service":"QuickStocks API"}`.
- `/api/auth/status` returns setup/sign-in state.
- After login, create a stock in **Stock Universe** and check it persists after refreshing.

## Quality commands

```powershell
npm run typecheck
npm run build
npm test
```

## Database records

The app stores documents in collections: `users`, `stocks`, `strategies`, `matches`, `watchlists`, `trades`, and `journal`. Each record gets a MongoDB ObjectId and automatic timestamps. The backend validates request bodies with Zod, uses parameterized ObjectIds for document operations, and scopes CRUD to authenticated requests.

**Relationships:** New mappings and trades must reference both an existing strategy and a tracked stock. The backend blocks removal of referenced strategies and blocks ticker changes/removal for stocks still linked to mappings, trades, journal entries, or watchlists. For existing installations, previously orphaned records must still be repaired manually. Symbol references are checked in application code, not enforced by foreign keys.

## Password reset

There is intentionally no password reset UI, email recovery, or multiple-account management. Keep your password secure. If it is lost, a trusted administrator with Atlas write access must reset the account (e.g., after backing up the collection, securely replacing the single-owner password hash). Deleting the user document also enables a fresh setup **only for someone with the SETUP_TOKEN**; restrict deployment access and rotate setup credentials before any recovery.

## Notes and limitations

- **Manual market inputs only.** No automatic NSE API, delayed quotations, scanning engine, earnings feed or refresh of prices.
- **Screenshot URL references only.** Does not upload/store image binary data. Journal screenshot links accept only HTTP(S) URLs and are accessible from the journal table.
- **Research performance = saved trades.** Backtested, paper, and live results have separate chart views. Each view uses illustrative sequential full-capital compounding and is **not** an actual portfolio equity curve. Returns must be recorded net of realistic costs.
- **No brokerage integration or trade execution.** This is a research notebook and analytics front-end, not an investment service.
- In production, use dedicated restricted MongoDB credentials and replace any shared/compromised MongoDB URI before deployment.

## October 2026 safety and integrity improvements

- First-time setup now requires a secret `SETUP_TOKEN`; passwords created during setup must be 12+ characters. Existing account passwords remain valid.
- Stock snapshots have an optional manual observation date; avoid treating undated quotes as live data.
- Invalid percentages (e.g., RSI above 100), negative prices/relative volume, malformed pagination and non-HTTP(S) screenshot links are rejected.
- Create/update checks prevent identical stock symbols for the same exchange and reject nonexistent strategy/stock references. Cross-record operations are app-level checks, **not atomic database transactions**.
- The performance panel separates backtest, paper and live data. Select the source above the chart; never interpret the index curve as broker-account performance.
- Search in strategy-stock matches includes the linked strategy name. Screenshot URLs are clickable from journal results.
- No existing MongoDB records are migrated or deleted by these changes. Older records that violate new constraints remain visible but may need correction before editing.

To generate two independent server secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the first as `SESSION_SECRET` and the second as `SETUP_TOKEN`. **Never use your MongoDB password as either secret.** After changing Vercel environment variables, redeploy so functions receive them.
