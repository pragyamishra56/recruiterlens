module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resumeText, role, jdText, isJDMatch } = req.body;

  try {
    const cleanText = resumeText
      .replace(/[^\x20-\x7E]/g, ' ')
      .substring(0, 1500);

    let prompt;

    if (isJDMatch) {
      prompt = `You are a senior recruiter. Compare this resume against the job description and reply ONLY in this exact JSON format with no extra text:
{"matchScore": 72, "missingSkills": ["skill 1 missing", "skill 2 missing", "skill 3 missing"], "roadmap": ["Learn X because Y", "Build a project with Z", "Get certified in W"]}

Give matchScore as number 0-100.
Give 3-5 missing skills specific to the JD.
Give 3-5 roadmap items that are specific and actionable.

Resume: ${cleanText}

Job Description: ${jdText.substring(0, 1000)}`;
    } else {
      prompt = `You are a recruiter hiring for a ${role} role. Analyze this resume and reply ONLY in this exact JSON format with no extra text:
{"score": 70, "feedback": [{"type": "error", "text": "problem here"}, {"type": "error", "text": "problem here"}, {"type": "warning", "text": "warning here"}, {"type": "warning", "text": "warning here"}, {"type": "success", "text": "good thing here"}, {"type": "success", "text": "good thing here"}]}

Give 2 errors, 2 warnings, 2 successes. Be specific to THIS resume and THIS role.
Resume: ${cleanText}`;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.VITE_GROQ_API_KEY
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
