---
title: Passkey login reset
type: concept
category: identity
sources: []
last_verified: 2026-08-26
status: current
tags: [login, passkeys, mfa, windows, chrome]
---

# Passkey login reset

Internal Salesforce login (`wecanride.my.salesforce.com`) can prompt for a **passkey** (Windows Hello / Chrome) after passwordless login or identity verification is enabled. If the device passkey is stale and Salesforce still has a registered authenticator, the user sees **Verify passkey** — not **Set up now**.

Symptom: Windows Security dialog “There was a problem signing in with your passkey.” A Salesforce toast may flash at the bottom and disappear. Login History shows `Passwordless Login via Passkeys required` with no Success.

Related: [[community-access]] (Experience Cloud is a different login URL: `wecanride.my.site.com`).

## Why local delete alone is not enough

A passkey has two halves:

1. **Device** — Windows Hello and/or Chrome / Google Password Manager
2. **Salesforce** — Built-in Authenticators (and sometimes Security Keys) on the User record

Deleting only the device half leaves Salesforce in verification mode. An admin must **Del** the authenticator on the User, then the next login can show Set up now.

## User: delete the device passkey (Windows + Chrome)

Close the Salesforce tab first.

### Windows 11

1. Open **Settings** → **Accounts** → **Passkeys** (or search Settings for “passkeys”).
2. Find entries for `salesforce.com` or `wecanride`.
3. Open **⋯** → **Delete passkey**. Confirm.

### Windows 10 (or if Passkeys is missing)

1. **Settings** → **Accounts** → **Sign-in options**. Confirm Windows Hello PIN still works; a PIN reset often breaks saved passkeys.
2. **Control Panel** → **Credential Manager** → **Web Credentials**. Remove Salesforce / We Can Ride entries.

### Chrome (this org’s typical browser)

1. Open Chrome.
2. Go to `chrome://settings/passkeys` **or** menu → **Passwords and autofill** → **Google Password Manager**.
3. Search `salesforce` and `wecanride`.
4. Delete matching passkeys.
5. If Google Password Manager is used: **Settings** inside Password Manager → **Manage passkeys in your Chrome profile** (only appears if local Chrome-profile passkeys exist).

Then restart Chrome.

## Admin: clear the Salesforce half

On the User record in Setup:

1. Open **Built-in Authenticators** → **Del** each row.
2. Open **Security Key (U2F or WebAuthn)** if present → **Del**.
3. If they also cannot get past password: reset password and/or **Generate Temporary Verification Code**.

After that, the user signs in again and should get **Set up now** / Create a passkey. Prefer saving the new passkey to **Windows Hello** on their usual PC, and name it clearly (for example “Office PC”).

## Related

- [[community-access]] — community site login is separate from internal passkey MFA
