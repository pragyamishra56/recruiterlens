const express = require('express');
const cors = require('cors');
const session = require('express-session');
const axios = require('axios');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://recruiterlens-green.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'recruiterlens-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// GitHub OAuth
app.get('/auth/github', (req, res) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
  res.redirect(githubAuthUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = userResponse.data;

    // Save user to Supabase
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        github_username: user.login,
        name: user.name || user.login,
        avatar_url: user.avatar_url,
        email: user.email
      });

    if (error) console.error('User save error:', error);

    const userData = encodeURIComponent(JSON.stringify({
      id: user.id,
      name: user.name || user.login,
      username: user.login,
      avatar: user.avatar_url,
      email: user.email
    }));

    res.redirect(`${process.env.FRONTEND_URL}?user=${userData}`);

  } catch (err) {
    console.error('Auth error:', err);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

// Save analysis to database
app.post('/api/save-analysis', async (req, res) => {
  const { userId, role, score, feedback, resumeText } = req.body;

  try {
    const { data, error } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        role,
        score,
        feedback,
        resume_text: resumeText
      })
      .select();

    if (error) throw error;
    res.json({ success: true, data });

  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user's analysis history
app.get('/api/history/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ history: data });

  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: err.message });
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
