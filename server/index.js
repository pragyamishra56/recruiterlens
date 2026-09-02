// const express = require('express');
// const cors = require('cors');
// const session = require('express-session');
// const axios = require('axios');
// const { Pool } = require('pg');
// require('dotenv').config();

// const app = express();

// // PostgreSQL connection
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }
// });

// // Create tables if not exists
// async function initDB() {
// // Save user to PostgreSQL (optional)
// try {
//   await pool.query(`
//     INSERT INTO users (id, github_username, name, avatar_url, email)
//     VALUES ($1, $2, $3, $4, $5)
//     ON CONFLICT (id) DO UPDATE
//     SET name = $3, avatar_url = $4, email = $5
//   `, [user.id, user.login, user.name || user.login, user.avatar_url, user.email]);
// } catch (dbErr) {
//   console.log('DB save skipped:', dbErr.message);
//   // Continue even if DB fails!
// }
// }

// initDB();

// app.use(cors({
//   origin: [
//     process.env.FRONTEND_URL,
//     'https://recruiterlens-green.vercel.app'
//   ],
//   credentials: true
// }));

// app.use(express.json());

// app.use(session({
//   secret: process.env.SESSION_SECRET || 'recruiterlens-secret',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: true,
//     maxAge: 24 * 60 * 60 * 1000
//   }
// }));

// // GitHub OAuth
// app.get('/auth/github', (req, res) => {
//   const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
//   res.redirect(githubAuthUrl);
// });

// app.get('/auth/callback', async (req, res) => {
//   const { code } = req.query;

//   try {
//     const tokenResponse = await axios.post(
//       'https://github.com/login/oauth/access_token',
//       {
//         client_id: process.env.GITHUB_CLIENT_ID,
//         client_secret: process.env.GITHUB_CLIENT_SECRET,
//         code
//       },
//       { headers: { Accept: 'application/json' } }
//     );

//     const accessToken = tokenResponse.data.access_token;

//     const userResponse = await axios.get('https://api.github.com/user', {
//       headers: { Authorization: `Bearer ${accessToken}` }
//     });

//     const user = userResponse.data;

//     // Save user to PostgreSQL
//     await pool.query(`
//       INSERT INTO users (id, github_username, name, avatar_url, email)
//       VALUES ($1, $2, $3, $4, $5)
//       ON CONFLICT (id) DO UPDATE
//       SET name = $3, avatar_url = $4, email = $5
//     `, [user.id, user.login, user.name || user.login, user.avatar_url, user.email]);

//     const userData = encodeURIComponent(JSON.stringify({
//       id: user.id,
//       name: user.name || user.login,
//       username: user.login,
//       avatar: user.avatar_url,
//       email: user.email
//     }));

//     res.redirect(`${process.env.FRONTEND_URL}?user=${userData}`);

//   } catch (err) {
//     console.error('Auth error:', err);
//     res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
//   }
// });

// // Save analysis
// app.post('/api/save-analysis', async (req, res) => {
//   const { userId, role, score, feedback, resumeText } = req.body;

// try {
//     const result = await pool.query(`
//       INSERT INTO analyses (user_id, role, score, feedback, resume_text)
//       VALUES ($1, $2, $3, $4, $5)
//       RETURNING *
//     `, [userId, role, score, JSON.stringify(feedback), resumeText]);
//     res.json({ success: true, data: result.rows[0] });
//   } catch (err) {
//     console.log('History save skipped:', err.message);
//     res.json({ success: true, data: null });
//   }
// });

// // Get history
// app.get('/api/history/:userId', async (req, res) => {
//   const { userId } = req.params;

//   try {
//     const result = await pool.query(`
//       SELECT * FROM analyses
//       WHERE user_id = $1
//       ORDER BY created_at DESC
//     `, [userId]);

//     res.json({ history: result.rows });

//   } catch (err) {
//     console.log('History fetch skipped:', err.message);
//     res.json({ history: [] });
//   }
// });

// app.get('/auth/user', (req, res) => {
//   if (req.session && req.session.user) {
//     res.json({ user: req.session.user });
//   } else {
//     res.json({ user: null });
//   }
// });

// // Logout
// app.get('/auth/logout', (req, res) => {
//   req.session.destroy();
//   res.json({ success: true });
// });

// const PORT = process.env.PORT || 3001;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        github_username TEXT UNIQUE NOT NULL,
        name TEXT,
        avatar_url TEXT,
        email TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS analyses (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id BIGINT REFERENCES users(id),
        role TEXT NOT NULL,
        score INTEGER NOT NULL,
        feedback JSONB NOT NULL,
        resume_text TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Database tables ready!');
  } catch (err) {
    console.log('DB init skipped (non-fatal):', err.message);
  }
}
initDB();

app.use(cors({
  origin: [process.env.FRONTEND_URL, 'https://recruiterlens-green.vercel.app'],
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'recruiterlens-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, maxAge: 24 * 60 * 60 * 1000 }
}));

app.get('/auth/github', (req, res) => {
  console.log('--- Step A: /auth/github hit ---');
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
  res.redirect(githubAuthUrl);
});

app.get('/auth/callback', async (req, res) => {
  console.log('--- Step B: /auth/callback hit ---');
  const { code } = req.query;
  console.log('Code received:', code ? 'YES' : 'NO CODE!');

  if (!code) {
    console.log('FAILED: No code in query params');
    return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  }

  let accessToken;
  try {
    console.log('--- Step C: Exchanging code for token ---');
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      { headers: { Accept: 'application/json' } }
    );
    console.log('Token response data:', JSON.stringify(tokenResponse.data));
    accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      console.log('FAILED: No access_token in response. Full response:', tokenResponse.data);
      return res.redirect(`${process.env.FRONTEND_URL}?error=no_token&detail=${encodeURIComponent(JSON.stringify(tokenResponse.data))}`);
    }
  } catch (tokenErr) {
    console.log('FAILED at token exchange:', tokenErr.message);
    return res.redirect(`${process.env.FRONTEND_URL}?error=token_exchange_failed&detail=${encodeURIComponent(tokenErr.message)}`);
  }

  let user;
  try {
    console.log('--- Step D: Fetching GitHub user ---');
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    user = userResponse.data;
    console.log('User fetched:', user.login);
  } catch (userErr) {
    console.log('FAILED at fetching user:', userErr.message);
    return res.redirect(`${process.env.FRONTEND_URL}?error=user_fetch_failed&detail=${encodeURIComponent(userErr.message)}`);
  }

  // DB save is OPTIONAL — never blocks login
  try {
    console.log('--- Step E: Saving user to DB (optional) ---');
    await pool.query(`
      INSERT INTO users (id, github_username, name, avatar_url, email)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE
      SET name = $3, avatar_url = $4, email = $5
    `, [user.id, user.login, user.name || user.login, user.avatar_url, user.email]);
    console.log('DB save successful');
  } catch (dbErr) {
    console.log('DB save FAILED (non-fatal, continuing login):', dbErr.message);
  }

  console.log('--- Step F: Redirecting to frontend with user data ---');
  const userData = encodeURIComponent(JSON.stringify({
    id: user.id,
    name: user.name || user.login,
    username: user.login,
    avatar: user.avatar_url,
    email: user.email
  }));

  res.redirect(`${process.env.FRONTEND_URL}?user=${userData}`);
});

app.post('/api/save-analysis', async (req, res) => {
  const { userId, role, score, feedback, resumeText } = req.body;
  try {
    const result = await pool.query(`
      INSERT INTO analyses (user_id, role, score, feedback, resume_text)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, role, score, JSON.stringify(feedback), resumeText]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.log('Save analysis skipped:', err.message);
    res.json({ success: true, data: null });
  }
});

app.get('/api/history/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT * FROM analyses WHERE user_id = $1 ORDER BY created_at DESC
    `, [userId]);
    res.json({ history: result.rows });
  } catch (err) {
    console.log('History fetch skipped:', err.message);
    res.json({ history: [] });
  }
});

app.get('/auth/user', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
});

app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
