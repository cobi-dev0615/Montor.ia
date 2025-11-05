# Quick Fix: Email Verification Not Working

## ✅ What I Fixed

1. **Created Auth Callback Route** (`app/api/auth/callback/route.ts`)
   - Handles Supabase verification links automatically
   - Creates user profile when email is verified
   - Redirects to dashboard after verification

2. **Updated Registration Form**
   - Added proper `emailRedirectTo` URL
   - Verification links now point to your callback route

3. **Updated Resend Email**
   - Includes proper redirect URL

## 🔧 Required Supabase Configuration

You **must** configure these settings in Supabase Dashboard:

### Step 1: Configure Site URL

1. Go to: https://app.supabase.com/project/poqjbackapixblcwnmvo/auth/url-configuration
2. Set **Site URL** to: `http://localhost:3000`
3. Click **Save**

### Step 2: Add Redirect URLs

In the same page, add these to **Redirect URLs**:
```
http://localhost:3000/api/auth/callback
http://localhost:3000/dashboard
http://localhost:3000/verify-email
```

### Step 3: Enable Email Confirmations

1. Go to: https://app.supabase.com/project/poqjbackapixblcwnmvo/auth/providers
2. Scroll to **Email** provider
3. Ensure **Enable email confirmations** is checked ✅
4. Click **Save**

### Step 4: Check Email Provider

1. Go to: https://app.supabase.com/project/poqjbackapixblcwnmvo/auth/providers
2. Check **Email** provider settings
3. **For Development**: Supabase's built-in email works (limited to ~3/hour)
4. **For Production**: Configure custom SMTP (see SUPABASE_EMAIL_SETUP.md)

## 🧪 Test It

1. **Restart your dev server** (important!)
   ```bash
   npm run dev
   ```

2. **Register a new account**
   - Go to http://localhost:3000/register
   - Fill in details and submit

3. **Check your email**
   - Look for email from Supabase
   - Check spam folder if not in inbox
   - Click the verification link

4. **Verify it works**
   - Should redirect to `/dashboard`
   - Your account should be verified

## 🐛 Still Not Working?

### Check Supabase Email Logs

1. Go to: https://app.supabase.com/project/poqjbackapixblcwnmvo/auth/logs
2. Look for email sending attempts
3. Check for any error messages

### Common Issues

**Issue**: "Invalid redirect URL"
- **Fix**: Make sure redirect URLs are added in Supabase settings

**Issue**: Email not sending
- **Fix**: Check email provider settings, verify SMTP if using custom

**Issue**: Link works but doesn't verify
- **Fix**: Check that callback route exists: `app/api/auth/callback/route.ts`

**Issue**: Email goes to spam
- **Fix**: Normal for development. Use custom SMTP for production.

## 📚 Full Documentation

See `SUPABASE_EMAIL_SETUP.md` for complete setup guide including:
- SMTP configuration
- Email template customization
- Production setup
- Troubleshooting

## ✨ What's Working Now

Your app now uses **Supabase's native two-step authentication**:

1. **Step 1 - Email Verification** (Registration):
   - User signs up → Email sent → User clicks link → Account verified ✅

2. **Step 2 - MFA** (Optional, Login):
   - User can enable MFA in Settings
   - After password login, user enters 6-digit code ✅

Both use Supabase's built-in features - no custom implementation needed!

