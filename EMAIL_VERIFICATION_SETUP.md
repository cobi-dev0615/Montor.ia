# Supabase Email Verification Implementation

## ✅ What's Implemented

Your app now uses **Supabase's built-in email verification**:

1. **Registration** → User signs up → Supabase sends verification email
2. **Email Verification** → User clicks link → Email verified → Profile updated
3. **Dashboard Access** → User can now access the app

## 🔄 How It Works

### Registration Flow:

```
User fills form
    ↓
supabase.auth.signUp() called
    ↓
User profile created in public.users (using user ID)
    ↓
If email verification enabled:
  - Supabase sends verification email automatically
  - No session returned (user not logged in yet)
  - Redirect to /verify-email page
    ↓
User clicks link in email
    ↓
/api/auth/callback route exchanges code for session
    ↓
Email verified, session created
    ↓
Redirect to /dashboard
```

### Email Verification Process:

1. **User signs up** → `supabase.auth.signUp()` creates auth user
2. **Profile created** → User profile inserted into `public.users` immediately
3. **Email sent** → Supabase automatically sends verification email (if enabled)
4. **User clicks link** → Link contains verification code
5. **Callback route** → `/api/auth/callback` exchanges code for session
6. **Verified** → User's email is confirmed, session is active

## 🔧 Supabase Configuration Required

### Step 1: Enable Email Confirmations

1. Go to: https://app.supabase.com/project/poqjbackapixblcwnmvo/auth/providers
2. Find **Email** provider
3. **Check** "Enable email confirmations" ✅
4. Click **Save**

### Step 2: Configure Site URL

1. Go to: https://app.supabase.com/project/poqjbackapixblcwnmvo/auth/url-configuration
2. Set **Site URL** to: `http://localhost:3000`
3. Click **Save**

### Step 3: Add Redirect URLs

In the same page, add these to **Redirect URLs**:
```
http://localhost:3000/api/auth/callback
http://localhost:3000/dashboard
```

### Step 4: Configure Email Provider (Optional)

**For Development:**
- Supabase's built-in email works (limited to ~3 emails/hour on free tier)
- Good for testing

**For Production:**
- Configure custom SMTP in **Authentication** → **Settings** → **SMTP Settings**
- See `SUPABASE_EMAIL_SETUP.md` for detailed SMTP configuration

## 📋 Code Flow

### Registration (`RegisterForm.tsx`):

```typescript
// 1. Sign up with email verification enabled
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
    data: { full_name: fullName }
  }
})

// 2. Create profile immediately using user ID
if (data.user) {
  await supabase.from('users').insert({
    id: data.user.id,  // Use user ID from signUp
    email: data.user.email,
    // ... other fields
  })
}

// 3. If no session, email verification required
if (!data.session) {
  router.push('/verify-email?email=...')
}
```

### Email Verification Callback (`app/api/auth/callback/route.ts`):

```typescript
// Exchange verification code for session
const { data } = await supabase.auth.exchangeCodeForSession(code)

// Ensure profile exists (upsert handles both cases)
await supabase.from('users').upsert({
  id: user.id,
  // ... profile data
}, { onConflict: 'id' })

// Redirect to dashboard
```

## 🧪 Testing

### Test Email Verification:

1. **Register a new account**:
   - Go to http://localhost:3000/register
   - Fill in details and submit
   - Should redirect to `/verify-email` page

2. **Check email**:
   - Look for email from Supabase
   - Check spam folder if not in inbox
   - Email should contain verification link

3. **Click verification link**:
   - Link format: `http://localhost:3000/api/auth/callback?code=...&next=/dashboard`
   - Should redirect to `/dashboard`
   - User should be logged in

4. **Verify profile**:
   - Check Supabase Dashboard → Table Editor → `users`
   - Profile should exist with user ID

## 🔍 Important Notes

### Profile Creation:

- **Profile is created immediately** during registration (using user ID)
- **Even if email is not verified yet**, profile exists in database
- When email is verified, profile is ensured to exist (upsert)

### Session Handling:

- **Before verification**: No session (user not logged in)
- **After verification**: Session created (user logged in)
- **Callback route**: Handles the verification and session creation

### Email Verification Status:

- Check `user.email_confirmed_at` to see if email is verified
- Unverified users can still have profiles in database
- You can restrict access based on verification status if needed

## 🐛 Troubleshooting

### Email Not Received:

1. **Check Supabase email logs**: Dashboard → Authentication → Logs
2. **Verify email provider**: Check if SMTP is configured
3. **Check spam folder**: Supabase emails sometimes go to spam
4. **Rate limits**: Free tier has ~3 emails/hour limit

### Verification Link Not Working:

1. **Check redirect URLs**: Must include `/api/auth/callback`
2. **Verify Site URL**: Must match your app URL
3. **Check callback route**: Ensure `app/api/auth/callback/route.ts` exists
4. **Check code parameter**: URL should have `?code=...` parameter

### Profile Not Created:

1. **Check RLS policies**: Ensure INSERT policy allows authenticated users
2. **Check database**: Verify `users` table exists
3. **Check errors**: Look at browser console and Supabase logs

## 📚 Resources

- [Supabase Email Verification Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Auth Callbacks](https://supabase.com/docs/guides/auth/auth-callback-urls)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)

## ✨ Features

✅ **Automatic email sending** - Supabase handles it  
✅ **Secure verification links** - Uses tokens and codes  
✅ **Profile creation** - Happens immediately during signup  
✅ **Callback handling** - Automatic session creation  
✅ **Resend email** - Users can request new verification email  
✅ **Status checking** - Real-time verification status updates  

Your email verification is now fully implemented using Supabase's built-in functionality! 🎉

