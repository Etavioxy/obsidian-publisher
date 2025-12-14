# Obsidian Publisher - Web UI

A lightweight, modern admin web UI for managing Obsidian Publisher sites.

## Features

- 🔐 User Authentication (Login/Register)
- 👤 User Profile Management
- 📊 Statistics Dashboard
- 🎨 Modern UI with UnoCSS
- ⚡ Built with Vite for fast development
- 🧪 Test Suite
- 🛣️ Hash-based Routing with Guards

## Architecture

```
src/
├── main.ts                 # App entry point
├── router.ts              # Hash-based router with guards
├── api.ts                 # API client
├── state/
│   └── auth.ts            # Auth store (localStorage + in-memory)
├── views/
│   ├── login.ts           # Login page
│   ├── register.ts        # Registration page
│   ├── me.ts              # User profile page
│   ├── admin.ts           # Admin panel (placeholder)
│   └── 404.ts             # 404 page
└── ui/
    └── components.ts      # Reusable UI components
```

## Tech Stack

- **TypeScript**: Strict type safety
- **Vite**: Lightning-fast build tool
- **UnoCSS**: Atomic CSS framework
- **Native DOM**: No framework dependencies
- **Hash Routing**: Client-side navigation

## Getting Started

### Prerequisites

- Node.js 16+
- pnpm (recommended) or npm

### Installation

```bash
cd server/webui
pnpm install
```

### Development

#### Option 1: With Real Rust Backend

```bash
# Terminal 1: Start Rust backend
cd server
cargo run

# Terminal 2: Start Vite dev server
cd server/webui
pnpm dev
```

Then open `http://localhost:3000`

#### Option 2: With Mock API (For Frontend-only Development)

```bash
# Terminal 1: Start mock API server
cd server/webui
node build/mock-api-server.mjs

# Terminal 2: Start Vite dev server
cd server/webui
pnpm dev
```

**Test Credentials:**
- Username: `admin`
- Password: `password123`

### Build

```bash
pnpm build
```

Output will be in `dist/` directory.

### Preview

```bash
pnpm preview
```

## Routing

The app uses hash-based routing with automatic guards:

- `#/login` - Login page (redirects to `/me` if already authenticated)
- `#/register` - Registration page (redirects to `/me` if already authenticated)
- `#/me` - User profile (requires authentication)
- `#/admin` - Admin panel (requires authentication + admin role)
- `#/404` - Not found page

## Authentication

### Auth Flow

1. User registers/logs in
2. Server returns JWT token
3. Token stored in localStorage
4. Token included in API requests via `Authorization: Bearer <token>` header
5. On 401 response, token is cleared and user redirected to login

### Auth Store

The auth store provides:

```typescript
authStore.getToken()      // Get current token
authStore.getUser()       // Get current user
authStore.isAuthed()      // Check if authenticated
authStore.isAdmin()       // Check if admin (placeholder)
authStore.setAuth()       // Set auth from login response
authStore.clear()         // Clear auth state
authStore.subscribe()     // Listen to auth changes
```

## UI Components

All components are pure functions that return DOM elements:

- `Button` - Interactive button
- `Input` - Form input field
- `FormGroup` - Label + Input + Error message
- `Alert` - Notification alert
- `Card` - Content container
- `LoadingSpinner` - Loading indicator

## API Client

Provides typed interfaces for all API calls:

```typescript
// Auth
authAPI.register(username, password)
authAPI.login(username, password)
authAPI.me()

// User
userAPI.getProfile()
userAPI.updateProfile(username)
userAPI.getStats()
userAPI.deleteAccount()

// Sites
sitesAPI.listAll()
sitesAPI.upload(formData)
sitesAPI.update(id, description)
sitesAPI.delete(id)
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

Tests verify:
- ✓ Auth store initialization
- ✓ Router configuration
- ✓ UI components generation
- ✓ API client structure

## Development Notes

### File Size & Performance

- Minimal dependencies (UnoCSS + TypeScript)
- No framework overhead
- Tree-shakeable modules
- Optimized for production builds

### Browser Support

- Modern browsers (ES2020+)
- Chrome, Firefox, Safari, Edge

### Styling

Uses UnoCSS utility classes. No CSS-in-JS or preprocessors needed.

Common utilities:
- `flex`, `grid` - Layout
- `p-4`, `mx-2` - Spacing
- `bg-blue-600`, `text-white` - Colors
- `rounded-md`, `shadow-md` - Effects
- `hover:`, `focus:` - States

### Adding New Views

1. Create `src/views/myview.ts`
2. Export a function `createMyViewView()` that returns `HTMLDivElement`
3. Add route to `router.ts`
4. Import and handle in `main.ts`

Example:

```typescript
export function createMyViewView(): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4';
  
  const card = Card({
    title: 'My View',
    children: document.createElement('p'),
  });
  
  container.appendChild(card);
  return container;
}
```

## Integration with Rust Backend

The Vite dev server proxies API requests to the Rust backend:

```
Frontend Request: /auth/login
├─ Vite Proxy    → http://localhost:8080/auth/login
└─ Response      → Browser
```

In production, the built `dist/` folder should be served from the Rust server:

```rust
.nest_service("/webui", ServeDir::new("../server/webui/dist"))
```

And the default route should redirect to `/webui/`:

```rust
.route("/", get(|| async {
    Redirect::permanent("/webui/")
}))
```

## Environment Variables

Create `.env.local` for development:

```env
VITE_API_URL=http://localhost:8080
VITE_AUTH_URL=http://localhost:8080/auth
```

## License

See main project LICENSE file.
