# SportStore Platform

SportStore is a full-stack sports commerce app built with React, TypeScript, Express, MongoDB, and Socket.IO.

It supports product browsing, filtering, cart flow, checkout, admin product management, inventory updates, and admin account seeding.

## What This Project Includes

- Customer collection page with filtering and add-to-cart flow
- Admin dashboards for products, inventory, orders, and users
- JWT authentication with protected routes
- MongoDB transactions to reduce overselling during checkout
- Real-time inventory updates with Socket.IO
- Validation with TypeScript and Zod

## Tech Stack

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Zustand
- Axios
- Socket.IO client

### Backend

- Node.js
- Express
- TypeScript
- MongoDB with Mongoose
- JWT
- Socket.IO
- Zod

## Requirements

Before running the app, make sure you have:

- Node.js 20 or newer
- npm
- MongoDB running locally or a hosted MongoDB connection string

## Project Structure

```text
SportStore/
  backend/
    src/
    scripts/
    public/
  frontend/
    src/
```

## Quick Start

### 1) Install dependencies

Open two terminals and run:

```bash
cd backend
npm install
```

```bash
cd frontend
npm install
```

### 2) Configure the backend

Copy the example environment file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` if needed. At minimum, make sure `MONGODB_URI` points to a valid MongoDB database.

### 3) Start the app in development

Run the backend in one terminal:

```bash
cd backend
npm run dev
```

Run the frontend in another terminal:

```bash
cd frontend
npm run dev
```

The frontend will open in the browser, and it will connect to the backend API.

## Start in Production Mode

If you want to run the built version instead of the dev server:

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm run build
npm run preview
```

## Seed an Admin Account

Use the admin seed script to create the first admin user.

### Recommended command

```bash
cd backend
ADMIN_SEED_PASSWORD="YourStrongPassword123!" npm run seed:admin
```

### What it creates

- Email: `admin@sportsstore.com`
- Password: value from `ADMIN_SEED_PASSWORD`

If `ADMIN_SEED_PASSWORD` is not provided, the script falls back to a default password and prints a warning. That default should only be used for local development.

More details are available in [SEED.md](SEED.md).

## Useful Backend Scripts

From the `backend` folder:

- `npm run dev` - start the backend in development mode
- `npm run build` - compile TypeScript
- `npm start` - run the compiled backend
- `npm run seed:admin` - create the admin account
- `npm run seed:catalog` - seed catalog data

## Notes for Beginners

- Run the backend before using the frontend.
- Keep the backend terminal open while developing.
- If the frontend cannot load data, check that the backend is running and `MONGODB_URI` is correct.
- If you change environment values, restart the backend.

## Main Features

### Customer side

- Browse the collection
- Filter products
- Add items to cart
- Checkout with inventory checks
- View account and order pages

### Admin side

- Create and edit products
- View inventory
- Manage orders
- Manage users

## More Information

If you want a deeper technical overview, review the source code in `backend/src` and `frontend/src`.
