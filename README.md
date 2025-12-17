# Video Call Application

A real-time video calling application built with WebRTC, NestJS, and Next.js in a Turborepo monorepo.

## Tech Stack

- **Frontend**: Next.js 15+ (App Router), React, Tailwind CSS, shadcn/ui
- **Backend**: NestJS, Socket.io, Redis
- **Real-time**: WebRTC, Socket.io
- **Database**: PostgreSQL (users, meetings), Redis (real-time state)
- **Monorepo**: Turborepo + pnpm

## Project Structure

```
.
├── apps/
│   ├── web/           # Next.js frontend
│   └── api/           # NestJS backend
├── packages/
│   ├── ui/            # Shared UI components
│   ├── types/         # Shared TypeScript types
│   ├── config/        # Shared configurations
│   └── utils/         # Shared utilities
├── docs/              # Documentation
└── docker-compose.yml # Infrastructure (Redis)
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker (for Redis)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

```bash
docker-compose up -d
```

### 3. Run development servers

```bash
pnpm dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000

## Available Commands

```bash
pnpm dev        # Start all apps in development mode
pnpm build      # Build all apps
pnpm lint       # Lint all apps
pnpm clean      # Clean build artifacts
pnpm format     # Format code with Prettier
```

## Environment Variables

See individual app README files for required environment variables:
- `apps/web/.env.local`
- `apps/api/.env`

## Documentation

- [Features Specification](./docs/features-specification.md)
- [Tech Stack](./docs/tech-stack.md)
- [Implementation Plan](./docs/implementation-plan.md)
- [API Contracts](./docs/api-contracts.md)
- [Component Specifications](./docs/component-specifications.md)
- [Database Schema](./docs/database-schema.md)

## Development Workflow

1. Create a new branch for your feature
2. Make changes in the appropriate app/package
3. Test locally with `pnpm dev`
4. Build to verify: `pnpm build`
5. Submit pull request

## License

MIT
