Welcome to your new TanStack Start app!

## The Hard Blok Web (marketing)

La web comercial está en **`the-hard-blok-web/`** (mismo repositorio Git que este TPV).

```bash
cd the-hard-blok-web
npm install
npm run dev
```

Por defecto corre en el **puerto 3001**. Copia `the-hard-blok-web/.env.example` a `the-hard-blok-web/.env` y define `VITE_TPV_APP_URL=http://localhost:3000` para que «Entrar» abra el login de este TPV.

# Getting Started (TPV)

To run this application:

```bash
npm install
npm run dev
```

# Building For Production

To build this application for production:

```bash
npm run build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
npm run test
```

## Auth Setup (Google + Better Auth)

Authentication is handled by [Better Auth](https://www.better-auth.com/) with Google OAuth, mounted at:

- `/api/auth/*` (see `src/routes/api/auth/$.tsx`)

App permissions/roles still live in your Postgres `users` table. On first successful Google login, a `users` row is created (or linked by email) and `google_sub` is stored.

Step-by-step env + Google (Spanish): [docs/variables-entorno-y-google.md](docs/variables-entorno-y-google.md). Template file: `.env.example`.

### 1) Database prerequisites

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Or with Node (loads `.env`):

```bash
npm run db:schema
```

This creates app tables (`users` including `google_sub`, `sessions`, `categories`, `products`) and indexes. It is safe to re-run (uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`).

Optional: seed admin user (password login) for emergencies:

```bash
npm run db:seed
```

### 2) Better Auth tables (library-managed schema)

Better Auth stores its own session tables in Postgres. Apply its migrations (loads `.env` via Node and uses `src/lib/auth.config.ts`):

```bash
npm run db:auth-migrate
```

### 3) Environment variables

Create/update your `.env`:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (32+ random chars)
- `BETTER_AUTH_URL` (example: `http://localhost:3000`)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- Optional: `GOOGLE_DEFAULT_ROLE` (`cashier` by default; can be `owner|admin|manager|cashier`)

### 4) Google Cloud Console

Add an OAuth Web client and set authorized redirect URI to:

- `http://localhost:3000/api/auth/callback/google` (dev)
- your production equivalent in prod

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `npm install @tailwindcss/vite tailwindcss -D`

## Linting & Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The following scripts are available:


```bash
npm run lint
npm run format
npm run check
```


## Shadcn

Add components using the latest version of [Shadcn](https://ui.shadcn.com/).

```bash
pnpm dlx shadcn@latest add button
```



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')
  
  useEffect(() => {
    getServerTime().then(setTime)
  }, [])
  
  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
