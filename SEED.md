# SEED Guide

This guide explains how to generate the admin account for SportStore.

## Admin Seed Script

The admin seed script is located at `backend/scripts/seedAdmin.ts` and is exposed by:

- `npm run seed`
- `npm run seed:admin`

Both run the same script.

## Default Admin Credentials

If no custom password is provided, the seed script creates this admin user:

- Email: `admin@sportsstore.com`
- Password: `SportStore_Admin#2026`

The script logs a warning when it falls back to the default password. Rotate this password immediately in non-local environments.

## Recommended (Custom Password)

From the backend folder, run:

```bash
cd backend
ADMIN_SEED_PASSWORD="YourStrongPassword123!" npm run seed:admin
```

Requirements:

- `ADMIN_SEED_PASSWORD` must be at least 8 characters.
- `MONGODB_URI` must point to a reachable database.

## Basic Seed (Uses Default Password)

```bash
cd backend
npm run seed:admin
```

## Full Setup Example

```bash
cd backend
cp .env.example .env
npm install
ADMIN_SEED_PASSWORD="YourStrongPassword123!" npm run seed:admin
```

## Expected Output

- If the admin does not exist: `Admin user created successfully for admin@sportsstore.com.`
- If the admin already exists: `Admin user already exists for admin@sportsstore.com.`

## Idempotent Behavior

The script is safe to run multiple times. It does not create duplicate admin users with the same email.

## Troubleshooting

- Connection errors:
  - Verify `MONGODB_URI` in `backend/.env`.
  - Ensure MongoDB is running and reachable.
- Command not found for `tsx`:
  - Run `npm install` in `backend` first.
- Password not applied:
  - Confirm `ADMIN_SEED_PASSWORD` is exported or passed inline in the same command.
