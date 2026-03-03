# 📡 NSE Swing Scanner — Mobile PWA

A mobile-first Progressive Web App for daily NSE swing trading scans, powered by Upstox live market data.

---

## 🚀 HOW TO RUN ON YOUR PHONE

### Option A: Host on GitHub Pages (FREE, permanent)

1. Create a GitHub account at github.com
2. Create a new repository named `swing-scanner`
3. Upload ALL files from the `public/` folder to the repo root
4. Go to **Settings → Pages → Branch: main → Save**
5. Your app URL: `https://yourusername.github.io/swing-scanner`
6. Open this URL on your phone → tap **"Add to Home Screen"**

Done! Works like a native app. ✅

### Option B: Host on Netlify (FREE, drag & drop)

1. Go to netlify.com → sign up free
2. Drag & drop the `public/` folder onto Netlify
3. Get a URL like `https://swing-scanner-xyz.netlify.app`
4. Open on phone → Add to Home Screen

### Option C: Run locally on PC, access from phone

```bash
# Install a simple server
npx serve public/

# Your phone and PC must be on the same WiFi
# Access via: http://YOUR_PC_IP:3000
```

---

## 🔑 CONNECTING UPSTOX API (Step by Step)

### Step 1 — Get API credentials
1. Go to: https://developer.upstox.com
2. Login with your Upstox broker credentials
3. Click **"Create App"**
4. Fill in:
   - App Name: `SwingScanner`
   - Redirect URL: `http://localhost`
   - Scope: ✅ Market Data
5. Click Create → Copy your **API Key** and **API Secret**

### Step 2 — Enter credentials in the app
1. Open the app on your phone
2. Tap **⚙️ SETUP** tab at the bottom
3. Paste your API Key and API Secret
4. Tap **Save & Connect**

### Step 3 — Get daily Access Token
Upstox tokens expire every day. Each morning:

1. In the SETUP tab, tap **"Open Auth URL in Browser"**
2. It opens the Upstox login page
3. Login with your Upstox account
4. After login, you'll be redirected to a URL like:
   `http://localhost/?code=XXXXXX`
5. Copy the `code` value from the URL
6. Exchange it for a token using:
   ```
   POST https://api.upstox.com/v2/login/authorization/token
   client_id=YOUR_API_KEY
   client_secret=YOUR_API_SECRET
   code=THE_CODE_YOU_COPIED
   redirect_uri=http://localhost
   grant_type=authorization_code
   ```
   OR use the Upstox developer portal's built-in token generator.
7. Paste the `access_token` into the app's ACCESS TOKEN field

### Step 4 — Run the scan!
Tap **⚡ RUN DAILY SCAN** and get live prices!

---

## 🌐 OPTIONAL: Deploy Proxy Server (if CORS issues)

If the app shows "API failed" errors in the browser:

1. Push `server.js` and `package.json` to a new GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Railway auto-deploys and gives you a URL
4. Paste that URL in the app's **Proxy URL** field in SETUP tab

---

## 📱 INSTALL AS NATIVE APP

### Android (Chrome):
- Open the URL in Chrome
- Tap the 3-dot menu → **Add to Home Screen**
- It installs like a native app with its own icon

### iPhone (Safari):
- Open the URL in Safari
- Tap Share button → **Add to Home Screen**
- Works offline too!

---

## ⚙️ FEATURES

- ✅ Real-time Upstox LTP integration
- ✅ 30 NSE large-cap stocks scanned
- ✅ RSI, Volume, EMA, MACD filters
- ✅ Min 10% upside target filter
- ✅ R:R ratio calculation
- ✅ Sector filtering
- ✅ Watchlist with persistence
- ✅ Auto-refresh every 5 minutes
- ✅ Push notifications
- ✅ Works offline (PWA)
- ✅ Installable on home screen

---

## ⚠️ DISCLAIMER

For educational purposes only. Not financial advice. All investments carry risk. Consult a SEBI-registered investment advisor.
