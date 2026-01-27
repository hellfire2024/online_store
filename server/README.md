# Custom Threads Online Store - Backend API

Node.js/Express backend with MySQL database for the Custom Threads online store application.

## Quick Start

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configure
3. Create MySQL database: `online_store`
4. Run migrations: `npm run db:migrate`
5. Seed data: `npm run db:seed`
6. Start server: `npm run dev`

## API Documentation

See `/DATABASE_SETUP.md` in the root directory for complete setup instructions and API endpoint documentation.

## Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed initial data
- `npm run db:reset` - Reset database (drops all tables)

## Tech Stack

- **Express.js** - Web framework
- **MySQL2** - Database driver with promise support
- **TypeScript** - Type safety
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation
