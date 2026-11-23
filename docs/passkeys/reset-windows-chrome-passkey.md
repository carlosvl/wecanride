# How to reset your Salesforce passkey (Windows + Chrome)

The login page is trying to use a saved passkey on this computer that no longer works. That is why you see **Windows Security → “There was a problem signing in with your passkey”**, and why there is **no “Set up now”** option.

A passkey lives in two places: on your computer, and on your Salesforce account. Please delete it on the computer first. We will remove the old one from Salesforce after that, and then you can create a new one.

Use the **Windows computer and Chrome browser** where you normally sign in.

---

## 1. Close Salesforce

Close every Salesforce tab in Chrome. You can leave Chrome open.

---

## 2. Delete the passkey in Windows

### If you have Windows 11

1. Click the **Start** button (Windows logo).
2. Type **passkeys** and open **Passkeys** (or go to **Settings → Accounts → Passkeys**).
3. Look for anything named **salesforce**, **We Can Ride**, or **wecanride**.
4. Click the **⋯** (three dots) next to it → **Delete passkey**.
5. Confirm.

### If you have Windows 10, or you do not see Passkeys

1. Open **Settings → Accounts → Sign-in options**.
2. Confirm your Windows Hello PIN still works. (If the PIN was recently reset, that often breaks the old passkey.)
3. Open **Control Panel → Credential Manager → Web Credentials**.
4. Remove any entries for Salesforce / We Can Ride / `salesforce.com`.

---

## 3. Delete the passkey in Chrome

1. Open **Google Chrome**.
2. Click the address bar at the top, paste this, and press Enter:

   `chrome://settings/passkeys`

3. If that page is empty, use the Chrome menu instead:
   - Click the **three dots** (top right)
   - **Passwords and autofill** → **Google Password Manager**
   - Search for **salesforce** and **wecanride**
4. Delete any matching passkeys.
5. Fully quit Chrome (close all Chrome windows), then open Chrome again.

---

## 4. Stop if Windows Security appears again

If the Windows Security box pops up before we have cleared your Salesforce account, click **Cancel**.

Do not keep clicking **Try again**. “Set up now” will not appear until the old passkey is removed from Salesforce.

Reply to us when you have finished steps 2 and 3.

---

## 5. Create a new passkey (after we confirm it is cleared)

We will email or text you when your old passkey is removed from Salesforce.

1. Open Chrome and go to:  
   https://wecanride.my.salesforce.com
2. Sign in with your username and the password we send (if we reset it).
3. When the browser or Windows asks to **create a passkey** or **Set up now**, choose **this computer** / **Windows Hello**.
4. Use your Windows PIN, fingerprint, or face — whichever you normally use to unlock this PC.
5. If it asks for a name, use something like **Office PC**.

After that, you should be able to sign in with the new passkey.

---

## If something does not match these screens

Reply with a screenshot of:

- Windows Settings → Passkeys (or Sign-in options), and
- the Chrome passkeys / Google Password Manager page

You do not need to send your PIN or password.
