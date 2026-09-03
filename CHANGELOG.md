# RecruiterLens — Changelog

All notable changes to this project, day by day.

---

## Sep 1, 2026
- Fixed GitHub OAuth login (session/redirect issues resolved)
- Fixed Groq API model — updated to `openai/gpt-oss-20b` after Llama models were deprecated
- End-to-end flow working: Login → Upload Resume → AI Analysis → Score
- Tested JD Matcher with real job descriptions (Honeywell — 72% match, accurate)
- Built dark mode UI with custom RL icon and branding

## Sep 2-3, 2026
- FIXED: Database connection permanently resolved — 
  switched to Supabase Transaction Pooler 
  (aws-1-ap-south-1.pooler.supabase.com:6543)
  after a week of debugging IPv6/hostname issues
- History feature now fully working — analyses save 
  and display correctly
- Fixed Groq model deprecation issue (updated to 
  openai/gpt-oss-20b)
- Full end-to-end flow verified: Login → Upload → 
  Analyze → JD Match → History — all working
- Lesson learned: always use Transaction Pooler 
  (not Direct connection) when connecting Supabase 
  from Render — Direct connection uses IPv6 which 
  Render's free tier can't reach

**Live:** recruiterlens-green.vercel.app
**Built by:** Pragya Mishra
