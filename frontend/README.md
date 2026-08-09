# SimRoll frontend

The SimRoll web interface uses React, TypeScript, and Vite. During local
development, browser requests to `/api` are proxied to the FastAPI server at
`http://127.0.0.1:8000`.

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` to override either the browser-facing API
base path or the development proxy target.
