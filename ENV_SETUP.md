# Environment Variables Setup

## Quick Fix for "Missing Supabase Environment Variables" Error

The error occurs because the `.env.local` file is missing or not properly configured.

## Solution

### Step 1: Create `.env.local` file

Create a new file named `.env.local` in the `chat/` directory with the following content:

```env
NEXT_PUBLIC_SUPABASE_URL=https://poqjbackapixblcwnmvo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcWpiYWNrYXBpeGJsY3dubXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNDMwNjEsImV4cCI6MjA3NzcxOTA2MX0.Ke3OHktdB7qIbZ1matI09BKkoXDji4jUZyHvbyh1sfc
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Restart Development Server

After creating `.env.local`, you **must restart** your development server:

1. Stop the current server (Ctrl+C in terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

⚠️ **Important**: Next.js only reads environment variables when the server starts. Changes to `.env.local` require a restart.

## File Location

The `.env.local` file should be in:
```
chat/
  ├── .env.local          ← Create this file here
  ├── .env.example        ← Example file (already exists)
  ├── package.json
  └── ...
```

## Verify Setup

1. Check that `.env.local` exists in `chat/` directory
2. Verify the file contains your Supabase credentials
3. Restart the dev server
4. The error should be resolved

## Troubleshooting

### Still getting the error after creating `.env.local`?

1. **Check file location**: Make sure `.env.local` is in the `chat/` directory (same level as `package.json`)
2. **Check file name**: Must be exactly `.env.local` (not `.env.local.txt` or `.env`)
3. **Restart server**: Stop and restart `npm run dev`
4. **Check for typos**: Ensure no extra spaces before/after the `=` sign
5. **Check quotes**: Don't use quotes around values in `.env.local`

### File is created but variables not loading?

- Make sure variable names start with `NEXT_PUBLIC_` for client-side access
- Check that there are no spaces: `NEXT_PUBLIC_SUPABASE_URL=value` (not `NEXT_PUBLIC_SUPABASE_URL = value`)
- Ensure file encoding is UTF-8

### Example `.env.local` format:

✅ **Correct:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://poqjbackapixblcwnmvo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

❌ **Incorrect:**
```env
NEXT_PUBLIC_SUPABASE_URL = https://...  # Spaces around =
NEXT_PUBLIC_SUPABASE_URL="https://..."  # Quotes around value
SUPABASE_URL=https://...                 # Missing NEXT_PUBLIC_ prefix
```

## Security Note

- `.env.local` is already in `.gitignore` - it won't be committed to git
- Never commit your actual API keys to version control
- Use `.env.example` for sharing the structure without real values

