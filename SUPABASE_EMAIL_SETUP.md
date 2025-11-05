# Supabase Email Verification Setup Guide

## Problem: Not Receiving Verification Emails

If you're not receiving verification emails from Supabase, follow these steps to configure email settings.

## Step 1: Configure Supabase Email Settings

### 1.1 Enable Email Confirmations

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project: `poqjbackapixblcwnmvo`
3. Navigate to **Authentication** → **Settings** (in the left sidebar)
4. Scroll to **Email Auth** section
5. Ensure **Enable email confirmations** is **checked** ✅

### 1.2 Configure Site URL

1. In **Authentication** → **Settings**
2. Find **Site URL** field
3. Set it to: `http://localhost:3000` (for development)
   - For production, use your actual domain: `https://yourdomain.com`

### 1.3 Configure Redirect URLs

1. In **Authentication** → **Settings**
2. Scroll to **Redirect URLs** section
3. Add these URLs:
   ```
   http://localhost:3000/api/auth/callback
   http://localhost:3000/dashboard
   http://localhost:3000/verify-email
   ```
   - For production, add your production URLs too

### 1.4 Configure Email Provider

**Option A: Use Supabase's Built-in Email (Free, Limited)**

Supabase provides free email sending but with limits:
- Works out of the box
- Limited to ~3 emails/hour (free tier)
- Good for development/testing

**Option B: Use Custom SMTP (Recommended for Production)**

For production, configure custom SMTP:

1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Fill in your SMTP provider details:
   - **Host**: e.g., `smtp.gmail.com` for Gmail
   - **Port**: e.g., `587` for TLS
   - **Username**: Your email address
   - **Password**: Your email password or app password
   - **Sender email**: The email address to send from
   - **Sender name**: Your app name

**Popular SMTP Providers:**
- **Gmail**: smtp.gmail.com (port 587)
- **SendGrid**: smtp.sendgrid.net (port 587)
- **Mailgun**: smtp.mailgun.org (port 587)
- **AWS SES**: email-smtp.region.amazonaws.com (port 587)

### 1.5 Customize Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Select **Confirm signup** template
3. Customize the email content:
   ```
   <h2>Confirm your signup</h2>
   
   <p>Follow this link to confirm your user:</p>
   <p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
   ```
4. The `{{ .ConfirmationURL }}` variable will be replaced with the actual verification link

## Step 2: Test Email Verification

### 2.1 Register a New Account

1. Go to http://localhost:3000/register
2. Fill in your details and submit
3. You should be redirected to `/verify-email` page

### 2.2 Check Your Email

1. Check your inbox for email from Supabase
2. Check spam/junk folder if not in inbox
3. Click the verification link in the email

### 2.3 Verify the Link Works

The link should:
- Open: `http://localhost:3000/api/auth/callback?code=...&next=/dashboard`
- Automatically verify your email
- Redirect you to `/dashboard`

## Troubleshooting

### Issue: Still Not Receiving Emails

**Solution 1: Check Supabase Email Logs**
1. Go to **Authentication** → **Logs**
2. Check if emails are being sent
3. Look for any error messages

**Solution 2: Verify Email Provider Settings**
- Check SMTP credentials are correct
- Verify sender email is verified with your provider
- Check if your email provider requires app passwords (Gmail)

**Solution 3: Check Email Limits**
- Free Supabase tier: ~3 emails/hour
- If you hit the limit, wait or upgrade
- Use custom SMTP for higher limits

**Solution 4: Test with Different Email**
- Try a different email provider
- Some email providers (like corporate emails) may block Supabase emails
- Try Gmail, Outlook, or Yahoo

**Solution 5: Check Redirect URLs**
- Ensure redirect URLs are configured correctly
- Verify Site URL matches your app URL
- Check that `/api/auth/callback` is in allowed redirect URLs

### Issue: Email Received But Link Doesn't Work

**Solution:**
1. Check that `Site URL` is set correctly
2. Verify redirect URLs include `/api/auth/callback`
3. Check browser console for errors
4. Ensure the callback route is working: `app/api/auth/callback/route.ts`

### Issue: "Invalid redirect URL" Error

**Solution:**
1. Go to Supabase Dashboard → Authentication → Settings
2. Add your redirect URL to the **Redirect URLs** list:
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:3000/dashboard`
3. Save settings
4. Try again

## Quick Setup Checklist

- [ ] Email confirmations enabled in Supabase
- [ ] Site URL set to `http://localhost:3000`
- [ ] Redirect URLs configured:
  - [ ] `http://localhost:3000/api/auth/callback`
  - [ ] `http://localhost:3000/dashboard`
- [ ] Email provider configured (SMTP or Supabase default)
- [ ] Email templates customized (optional)
- [ ] Tested registration flow
- [ ] Received verification email
- [ ] Clicked link and verified successfully

## Supabase's Built-in Two-Step Authentication

Supabase provides **two separate authentication features**:

### 1. Email Verification (Step 1 - Registration)
- **Purpose**: Verify user's email address during signup
- **How it works**: 
  1. User signs up
  2. Supabase sends verification email
  3. User clicks link
  4. Email verified, account activated
- **Status**: ✅ Already implemented in your app

### 2. Multi-Factor Authentication / MFA (Step 2 - Login)
- **Purpose**: Additional security layer after password login
- **How it works**:
  1. User enters email + password
  2. If MFA enabled, user enters 6-digit code from authenticator app
  3. User logged in
- **Status**: ✅ Already implemented in your app

## Configuration Summary

Your app now uses Supabase's native authentication:

1. **Email Verification**: Automatic during signup
2. **MFA**: Optional, can be enabled in Settings
3. **Auth Callback**: Handles verification links automatically
4. **Redirect URLs**: Properly configured

## Next Steps

1. ✅ Configure Supabase email settings (see above)
2. ✅ Test email verification flow
3. ✅ Set up custom SMTP for production (recommended)
4. ✅ Test MFA setup in Settings page

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [MFA Setup Guide](https://supabase.com/docs/guides/auth/mfa)

