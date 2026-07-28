# Google Login Setup

The frontend is already connected to Supabase project `anjbgbqkeukllsdxgckv`.
Google OAuth must also be enabled in the Supabase project before the login buttons can redirect.

## 1. Google Cloud OAuth client

Create a **Web application** OAuth 2.0 client in Google Cloud Console.

- Authorized JavaScript origin: `https://alchegit.github.io`
- Authorized redirect URI: `https://anjbgbqkeukllsdxgckv.supabase.co/auth/v1/callback`

Keep the generated client secret only in Google Cloud and Supabase. Never commit it to this repository.

The downloaded credential JSON is local-only and is stored outside the repository at:

`C:\Users\wlgns\.alchegit-secrets\google-oauth\`

Do not copy the JSON back into the repository. Files matching `client_secret_*.json` are blocked by `.gitignore`.

## 2. Supabase Google provider

Open Supabase Dashboard and select project `anjbgbqkeukllsdxgckv`.

The dashboard display name can be `neokim-game-likes`. Open that project and verify **Project Settings > General > Reference ID** is `anjbgbqkeukllsdxgckv`. If it matches, it is the project already used by the frontend and no new Supabase project is needed.

1. Open **Authentication > Sign In / Providers > Google**.
2. Enable Google.
3. Enter the Google Web client ID and client secret.
4. Save.

## 3. Supabase redirect URLs

Open **Authentication > URL Configuration**.

- Site URL: `https://alchegit.github.io/`
- Redirect URL: `https://alchegit.github.io/**`
- Local test redirect URL: `http://127.0.0.1:4173/**`

The production wildcard is limited to the trusted `alchegit.github.io` origin and allows login to return to StoryHeaven or any Webtoon page.

## 4. Verification

The Auth settings endpoint must report `external.google: true`:

```powershell
Invoke-RestMethod `
  -Uri "https://anjbgbqkeukllsdxgckv.supabase.co/auth/v1/settings" `
  -Headers @{ apikey = "sb_publishable_k6DOGCJ3PVC1av1RVxDt5w_NvOZubsE" }
```

After setup, a Google login click should redirect first to Supabase Auth and then to Google. On completion it returns to the page where login started.
