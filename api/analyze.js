module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resumeText, role } = req.body;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.VITE_GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{
          role: 'user',
          content: 'You are a recruiter hiring for a ' + role + ' role. Analyze this resume for that specific role and reply ONLY in JSON format like this: {"score": 70, "feedback": [{"type": "error", "text": "problem here"}, {"type": "warning", "text": "warning here"}, {"type": "success", "text": "good thing here"}]}. Give 2 errors, 2 warnings, 2 successes. Be specific to THIS resume and THIS role. Resume: ' + resumeText.substring(0, 1500)
        }],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
