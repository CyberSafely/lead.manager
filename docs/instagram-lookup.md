# Instagram lookup (Affiliates → Quick add)

Paste an Instagram link in **Affiliates → Quick add** and the name, followers and bio fill in. The app sends only the
username to the team's own Supabase function `ig-lookup` (`supabase/functions/ig-lookup/index.ts`). That function
asks Meta's Graph API (**Business Discovery**) and keeps the Meta token secret. Only signed-in team members can call it.

- Works for **business and creator** accounts. Meta doesn't return personal accounts: for those, paste the profile
  text (⌘A, ⌘C on the profile page) into the box that appears, and the app reads name and followers from it.
- TikTok and Facebook links fill in username, platform and link; name and followers come from pasted text.
- Limit: about 200 lookups per hour.
- Cloud build only. The local build parses links and pasted text and makes no network calls.

## One-time setup

You need: the CyberSafely Instagram account set to **Professional (Business or Creator)** and connected to a
**Facebook Page**, and admin access to that Page.

1. **Instagram:** Settings → Account type and tools → switch to Professional account. Then link it to the CyberSafely
   Facebook Page (Facebook Page → Settings → Linked accounts → Instagram).
2. **Meta app:** go to <https://developers.facebook.com/apps> → **Create app** → use case **Other** → type
   **Business** → name it "CyberSafely Lead Manager". In the app's dashboard, add the products **Facebook Login for
   Business** and **Instagram** (choose "API setup with Facebook login").
3. **Token:** open **Tools → Graph API Explorer**. Pick your app, then **Get User Access Token** with these permissions:
   `instagram_basic`, `pages_show_list`, `pages_read_engagement`, `business_management`. Approve the pop-up and
   select the CyberSafely Page and Instagram account.
4. **Long-lived token** (the Explorer's token lasts about an hour): open **Tools → Access Token Debugger**, paste the
   token, press **Extend Access Token**. That one lasts ~60 days.
   For a token that never expires: Business Settings → Users → **System users** → add one (Admin) → assign the app
   and the Page → **Generate new token** with the same permissions.
5. **Instagram account id:** in the Graph API Explorer, run
   `me/accounts?fields=name,instagram_business_account` and copy the `instagram_business_account.id` (a long number).
6. **Store both in Supabase** (never in the code or in chat): Supabase dashboard → project → **Edge Functions →
   Secrets** → add
   - `IG_ACCESS_TOKEN` = the long-lived or system-user token
   - `IG_USER_ID` = the id from step 5
7. **Deploy the function** (once, and again if `index.ts` changes):
   ```bash
   npx supabase login
   npx supabase functions deploy ig-lookup --project-ref sfpnfitrglyqaximhrrq
   ```
8. **Test:** in the app, Affiliates → Quick add → paste `https://www.instagram.com/instagram/`. Name and followers
   should fill in.

The app's "Look up" messages tell you what's wrong: "isn't set up yet" (step 6), "token has expired" (redo step 4),
"probably a personal account" (paste the profile text instead).

If Meta says the app needs **App Review** or **Advanced Access** for `instagram_basic` / `pages_read_engagement`,
request it in App Review → Permissions and features. Data about your own Page works in Development mode.
