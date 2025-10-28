# Database Schema

## Users Table

- `id` (UUID, primary key)
- `email` (VARCHAR, unique, not null)
- `username` (VARCHAR, unique, not null)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Posts Table

- `id` (UUID, primary key)
- `user_id` (UUID, foreign key -> users.id)
- `title` (VARCHAR, not null)
- `content` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
