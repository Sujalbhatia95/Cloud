# Put the website online with Vercel (no commands needed)

About 20 minutes. You need the GitHub account that owns `Sujalbhatia95/cloud`. Vercel's free **Hobby** plan and
the free **Neon** database plan are enough to start.

What happens automatically: every deployment runs `pnpm vercel-build` (set in `vercel.json`), which creates or
updates the database tables. On the very first deployment it also adds the clearly-labelled demo listings and
creates your admin account from the `ADMIN_EMAIL` / `ADMIN_PASSWORD` settings below.

## 1. Create the Vercel project

1. Go to <https://vercel.com/signup> and choose **Continue with GitHub**.
2. Click **Add New… → Project**. Find **cloud** and click **Import**. If it is not listed, click
   **Adjust GitHub App Permissions** and give Vercel access to the `cloud` repository.
3. Leave the framework (**Next.js**), root directory and build settings as they are.
4. Open **Environment Variables** and add these (name on the left, value on the right):

   | Name | Value |
   |---|---|
   | `SESSION_SECRET` | a long random value (at least 32 characters) |
   | `CRON_SECRET` | another long random value |
   | `ADMIN_EMAIL` | the email you will sign in with |
   | `ADMIN_PASSWORD` | a temporary password: 12+ characters mixing at least three of lower-case, upper-case, numbers and symbols, without common words like "admin" or "password" |
   | `ADMIN_NAME` | your name (optional) |

5. Click **Deploy**. **This first deployment is expected to fail** with "No database configured", because the
   database is added in the next step.

## 2. Add the database

1. In the project, open the **Storage** tab → **Create Database** → **Neon** (Serverless Postgres) → **Continue**.
2. Choose the **Free** plan and the region closest to India (for example **Singapore**). Click **Create**.
3. When asked which environments to connect, keep **Production**, **Preview** and **Development** ticked and
   click **Connect**. Vercel adds the database address (`DATABASE_URL`) to the project for you.
4. Open the **Deployments** tab, click **⋯** next to the failed deployment → **Redeploy**.

When it shows **Ready**, click **Visit**. Your site is live at an address like
`https://cloud-xxxx.vercel.app`. The admin is at **`/admin`** on that address.

## 3. Sign in

1. Open `https://<your address>/admin` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. You are asked to choose a new password straight away.
3. Back in Vercel → **Settings → Environment Variables**, delete `ADMIN_PASSWORD` (it is never used again).
4. In the admin, fill in **Business settings** and work through the **Compliance checklist**.

## 4. Email notifications (showing requests and enquiries)

Until this is done, requests are saved in the admin but no email is sent.

1. Sign up at <https://resend.com> **using associateshreekrishna775@gmail.com** (the address notifications go to).
2. In Resend, **API Keys → Create API Key**, copy it.
3. In Vercel → **Settings → Environment Variables**, add `RESEND_API_KEY` with that key, then redeploy.
4. In the admin, **Email delivery → Send test email**, and check the Gmail inbox (and spam folder).

Without your own domain, emails come from Resend's shared test sender, which may only deliver to the Gmail address
you signed up with. That is all this site needs for notifications. Once you have a domain, verify it in Resend and
set `EMAIL_FROM` (for example `Shree Krishna Associate <enquiries@your-domain.in>`).

## 5. Optional

- **Speed:** Vercel → **Settings → Functions → Function Region**: choose the same region as the database
  (for example Singapore, `sin1`), then redeploy.
- **Your own domain:** Vercel → **Settings → Domains → Add**, follow the DNS instructions, then set `SITE_URL` to
  `https://your-domain` and redeploy.
- **Before launch:** turn **demo mode off** in Admin → Business settings and go through
  [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).

## If something goes wrong

Open the failed deployment in Vercel → **Build Logs**. The database step prints one clear line:

- "No database configured" → do step 2, then redeploy.
- "ADMIN_PASSWORD rejected: …" → choose a stronger temporary password (see the table above), then redeploy.
- "No staff account yet" (a warning, not an error) → add `ADMIN_EMAIL` and `ADMIN_PASSWORD`, then redeploy.
