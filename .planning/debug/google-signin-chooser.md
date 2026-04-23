---
status: investigating
trigger: "Investigate why Google sign-in sometimes shows the email/manual input screen instead of the saved Google account chooser in this React + Supabase app"
created: 2026-04-23T00:00:00Z
updated: 2026-04-23T00:00:00Z
---

## Current Focus
hypothesis: The app can request Google account selection, but it cannot guarantee the saved-account chooser because Google decides whether to show an account list or an email-first screen based on the user's Google session state, browser privacy/cookie state, and any available login hint.
test: Compare the repo's OAuth call with Supabase and Google docs for the exact parameters that can be set and what they promise.
expecting: The repo will show a single Google OAuth redirect with prompt=select_account, and the docs will describe that as an optional request rather than a guarantee.
next_action: Summarize the controlling code path and upstream constraints.

## Symptoms
expected: Tapping the Google button should show the account picker/saved Google accounts like the screenshot with account chips/list.
actual: On many devices the Google sign-in page opens directly to an email/manual input field instead of account chooser.
errors: None reported.
reproduction: Tap the Google sign-in button on different devices/browsers; some show account list, others show manual email entry.
started: Unknown; likely existed before the prompt tweak.

## Eliminated

## Evidence
- timestamp: 2026-04-23T00:00:00Z
	checked: src/App.tsx handleGoogleAuth
	found: The Google button calls supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } } }).
	implication: The app is only sending OAuth parameters; there is no separate chooser UI implemented locally.
- timestamp: 2026-04-23T00:00:00Z
	checked: Supabase signInWithOAuth docs
	found: Supabase forwards provider-specific queryParams to the OAuth provider and redirects the user to the provider's authorization screen.
	implication: Supabase is not adding any special account-picker behavior beyond what Google receives in the auth request.
- timestamp: 2026-04-23T00:00:00Z
	checked: Google OAuth docs
	found: prompt is an optional space-delimited parameter; select_account means "prompt the user to select an account". login_hint can either prefill the email field or select the appropriate multi-login session.
	implication: Google may still show an email/manual-entry screen when it cannot or does not want to surface an account chooser; the app cannot force the chooser on every device.

## Resolution
root_cause: The app already requests select_account, but the chooser vs email-first screen is controlled by Google's OAuth UI and the user's browser/session state, not by any additional code in this repo. The repo does not contain a mechanism that can guarantee the saved-account chooser on all devices.
fix: No code fix can guarantee the screenshot-like chooser everywhere. The closest practical improvement is to keep prompt=select_account and, only when you already know the user's Google email from prior consent or profile data, add login_hint so Google can preselect that account or prefill the email field.
verification: 
files_changed: []
