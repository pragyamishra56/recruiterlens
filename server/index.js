const express = require('express');
const cors = require('cors');
const session = require('express-session');
const axios = require('axios');
require('dotenv').config();

const app = express();

// app.use(cors({
//   origin: process.env.FRONTEND_URL,
//   credentials: true
// }));
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

// Step 1 - Redirect to GitHub login
app.get('/auth/github', (req, res) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
  res.redirect(githubAuthUrl);
});

// Step 2 - GitHub sends user back here
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for access token
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

    // Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const user = userResponse.data;

    // Save user in session *****
    // req.session.user = {
    //   id: user.id,
    //   name: user.name || user.login,
    //   username: user.login,
    //   avatar: user.avatar_url,
    //   email: user.email
    // };
  
    // Redirect back to frontend
    //res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
    //res.redirect(`${process.env.FRONTEND_URL}`);

    // Pass user data in URL
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

// Get current user
app.get('/auth/user', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.json({ user: null });
  }
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
