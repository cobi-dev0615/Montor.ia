# Mentor.ai Frontend

Complete frontend implementation for Mentor.ai built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

Fill in your `.env.local` with your Supabase and OpenAI credentials.

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📁 Project Structure

```
chat/
├── app/                    # Next.js App Router
│   ├── (auth)/           # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Landing page
│   └── globals.css       # Global styles
├── components/
│   ├── auth/             # Auth components
│   ├── chat/             # Chat components
│   ├── dashboard/        # Dashboard components
│   ├── goals/            # Goals components
│   ├── layout/           # Layout components
│   ├── progress/         # Progress components
│   ├── settings/         # Settings components
│   └── ui/               # UI components
├── lib/
│   ├── supabase/         # Supabase clients
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   └── design-tokens.ts  # Design system
└── hooks/                # Custom React hooks
```

## 🎨 Design System

The project uses a comprehensive design system based on:
- **Colors**: Primary blues, mentor value colors (Clarity, Wisdom, Empathy, Purpose, Virtue)
- **Typography**: Inter (sans-serif) for UI, Merriweather (serif) for quotes
- **Spacing**: 4px base unit system
- **Components**: Reusable UI components with variants

See `lib/design-tokens.ts` for complete design system values.

## 📄 Pages

- **Landing Page** (`/`) - Hero, features, CTA
- **Login** (`/login`) - User authentication
- **Register** (`/register`) - Account creation
- **Dashboard** (`/dashboard`) - Overview, stats, activity
- **Goals** (`/goals`) - Goals list and management
- **Goal Detail** (`/goals/[id]`) - Goal details and milestones
- **Chat** (`/chat`) - AI mentor chat interface
- **Progress** (`/progress`) - Progress tracking and charts
- **Settings** (`/settings`) - Profile and account settings

## 🔧 Features

- ✅ Design system foundation
- ✅ Landing page with hero and features
- ✅ Authentication (login/register) with Supabase
- ✅ Protected routes
- ✅ Dashboard with stats and overview
- ✅ Goals management (list, create, detail)
- ✅ Chat interface structure
- ✅ Progress tracking page
- ✅ Settings page
- ✅ Responsive design
- ✅ UI component library

## 🔌 Integration Points

### Supabase
- User authentication
- User profiles
- Goals and milestones
- Messages/chat history
- Progress logs
- Real-time subscriptions

### API Routes Needed
- `/api/chat` - Chat with OpenAI
- `/api/goals` - Goals CRUD
- `/api/goals/[id]/milestones` - Milestone generation
- `/api/progress` - Progress tracking
- `/api/user` - User profile updates

## 📝 Next Steps

1. **Connect Supabase**: Set up database and run migrations
2. **Implement API Routes**: Create backend endpoints
3. **Add Real-time**: Set up Supabase real-time subscriptions
4. **Complete Components**: Add data fetching to components
5. **Add Charts**: Implement Recharts visualizations
6. **Testing**: Add unit and integration tests

## 🎯 Development Notes

- All components are created with TypeScript
- Tailwind CSS for styling
- Responsive design (mobile-first)
- TODO comments mark integration points
- Error and loading states need implementation
- Real-time features need Supabase subscriptions

## 📚 Documentation

See the parent directory for:
- `FRONTEND_BUILD_CHAT.md` - Complete build prompts
- `DEVELOPMENT_GUIDE.md` - Technical implementation guide
- `PAGES_AND_DESIGN_REQUIREMENTS.md` - Page specifications

Happy coding! 🚀
