# ExpenseFlow Pro - Agent Operating Instructions

## Core Mandate: Simultaneous Local & Live Deployment
Whenever ANY change, update, feature, or bug fix is made to this codebase:
1. **Local Verification:** Ensure changes work properly on local servers (`http://localhost:5173` and `http://127.0.0.1:5000`).
2. **Immediate Live Sync (Git Push):** As soon as the edit is completed and verified, immediately stage, commit, and push to GitHub (`origin main`). This triggers automatic continuous deployment to:
   - **Vercel** (Live Frontend)
   - **Render** (Live Backend)
3. **Database Consistency:** When database models, migrations, or data additions occur, always ensure the live **Neon PostgreSQL** database is synchronized alongside local SQLite.
4. **No Manual Reminders Needed:** Never leave work unpushed or requiring the user to ask for live deployment. Every update must be active in both local and live environments automatically.
