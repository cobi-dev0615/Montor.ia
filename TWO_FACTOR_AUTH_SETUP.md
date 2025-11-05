# Two-Factor Authentication Setup Guide

## Overview

Your Mentor.ai application now supports **Two-Step Authentication** with Supabase:

1. **Email Verification** - Required after registration
2. **Two-Factor Authentication (2FA)** - Optional, using TOTP (Time-based One-Time Password)

## Features Implemented

### ✅ Email Verification Flow

1. **Registration** → User signs up
2. **Email Verification** → User receives verification email
3. **Verification Page** → User confirms email
4. **Dashboard Access** → User can now log in

**Files:**
- `app/(auth)/verify-email/page.tsx` - Email verification page
- `components/auth/RegisterForm.tsx` - Updated to handle email verification

### ✅ Two-Factor Authentication (2FA)

1. **Setup** → User scans QR code with authenticator app
2. **Verification** → User enters 6-digit code to enable
3. **Login** → User enters password + 2FA code
4. **Management** → User can enable/disable in settings

**Files:**
- `components/auth/TwoFactorSetup.tsx` - 2FA setup component
- `components/auth/TwoFactorVerification.tsx` - 2FA verification component
- `components/settings/TwoFactorSection.tsx` - 2FA settings management
- `components/auth/LoginForm.tsx` - Updated to handle 2FA during login

## Supabase Configuration

### Step 1: Enable Email Verification

1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. Under **Email Auth**, ensure:
   - ✅ **Enable email confirmations** is checked
   - ✅ **Email templates** are configured

### Step 2: Enable MFA/2FA

1. Go to Supabase Dashboard → **Authentication** → **Settings**
2. Under **Multi-Factor Authentication**:
   - ✅ Enable **TOTP (Time-based One-Time Password)**
   - ✅ Configure MFA settings as needed

### Step 3: Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Customize the **Confirm signup** template:
   ```
   Click the link below to confirm your email:
   {{ .ConfirmationURL }}
   ```

## How It Works

### Email Verification Flow

```
User Registration
    ↓
Email Sent (if confirmation required)
    ↓
User Clicks Link / Verifies Email
    ↓
Profile Created in Database
    ↓
User Can Log In
```

### 2FA Flow

```
User Enables 2FA in Settings
    ↓
QR Code Generated
    ↓
User Scans with Authenticator App
    ↓
User Verifies with 6-Digit Code
    ↓
2FA Enabled
    ↓
On Login: Password + 2FA Code Required
```

## User Experience

### Registration with Email Verification

1. User fills out registration form
2. If email confirmation is required:
   - User is redirected to `/verify-email` page
   - User receives email with verification link
   - User clicks link or enters code
   - User is redirected to dashboard

### Login with 2FA

1. User enters email and password
2. If 2FA is enabled:
   - User sees 2FA verification screen
   - User enters 6-digit code from authenticator app
   - User is logged in

### Managing 2FA

1. User goes to **Settings** page
2. User sees **Two-Factor Authentication** section
3. User can:
   - Enable 2FA (if not enabled)
   - Disable 2FA (if enabled)
   - View 2FA status

## Testing

### Test Email Verification

1. Register a new account
2. Check email for verification link
3. Click link or use verification page
4. Verify you can log in

### Test 2FA

1. Log in to your account
2. Go to Settings
3. Click "Enable 2FA"
4. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
5. Enter 6-digit code to verify
6. Log out and log back in
7. You should be prompted for 2FA code

## Troubleshooting

### Email Verification Not Working

- Check Supabase email settings
- Verify email templates are configured
- Check spam folder
- Ensure SMTP is configured (if using custom email)

### 2FA Not Working

- Verify MFA is enabled in Supabase Dashboard
- Check that TOTP is enabled
- Ensure authenticator app time is synchronized
- Try re-scanning QR code

### "Invalid verification code" Error

- Check that authenticator app time is correct
- Ensure code hasn't expired (codes refresh every 30 seconds)
- Try waiting for next code
- Verify QR code was scanned correctly

## Security Best Practices

1. **Email Verification**: Always require email verification for new accounts
2. **2FA**: Encourage users to enable 2FA for better security
3. **Backup Codes**: Consider implementing backup codes for 2FA recovery
4. **Session Management**: Use secure session tokens
5. **Rate Limiting**: Implement rate limiting on auth endpoints

## Next Steps

1. ✅ Email verification is working
2. ✅ 2FA setup and verification is working
3. ⚠️ Add 2FA section to settings page
4. ⚠️ Add backup codes for 2FA recovery
5. ⚠️ Add email verification status indicator
6. ⚠️ Add password reset flow

## API Reference

### Supabase MFA Methods Used

- `supabase.auth.mfa.enroll()` - Start 2FA enrollment
- `supabase.auth.mfa.verify()` - Verify 2FA code
- `supabase.auth.mfa.listFactors()` - List user's MFA factors
- `supabase.auth.mfa.unenroll()` - Disable 2FA
- `supabase.auth.verifyOtp()` - Verify OTP code during login

## Support

For issues or questions:
1. Check Supabase documentation: https://supabase.com/docs/guides/auth
2. Review Supabase MFA guide: https://supabase.com/docs/guides/auth/mfa
3. Check application logs for errors

