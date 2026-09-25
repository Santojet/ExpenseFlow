# Automatic Sync to Local & Live Website

Whenever any feature, bug fix, or style modification is completed:
1. Verify local build and test correctness (e.g. `npm run build` or python test).
2. Automatically stage, commit with a descriptive message, and push to GitHub `origin main`.
3. This ensures both the local development environment and the live production website (Vercel frontend + Render backend + Neon PostgreSQL) stay 100% in sync without requiring manual intervention from the user.
4. If database schema or migrations are updated, ensure remote PostgreSQL (Neon DB) is kept aligned.
