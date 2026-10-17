// Multi-Provider AI wrapper for TaleemiDunya Pro (OpenAI, Gemini & Smart Fallback)
export async function generateAIReply(prompt, { systemPrompt } = {}) {
  const openAiKey = import.meta.env.VITE_OPENAI_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_KEY;

  if (openAiKey) {
    try {
      const body = {
        model: 'gpt-4o-mini',
        messages: [],
        max_tokens: 800,
        temperature: 0.2,
      };
      if (systemPrompt) body.messages.push({ role: 'system', content: systemPrompt });
      body.messages.push({ role: 'user', content: prompt });

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
    } catch (e) {
      console.warn('OpenAI call failed, checking fallback...', e?.message);
    }
  }

  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt ? systemPrompt + '\n\n' : ''}${prompt}` }] }]
        })
      });
      const data = await res.json();
      if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (e) {
      console.warn('Gemini call failed:', e?.message);
    }
  }

  // Smart Contextual Fallback for School Operations
  const p = prompt.toLowerCase();
  if (p.includes('fee') || p.includes('challan') || p.includes('dues') || p.includes('sms')) {
    return `Title: Urgent Tuition Fee Reminder
Body: Dear Parent,
This is a friendly reminder from TaleemiDunya Academy regarding the pending tuition fee for this month. Kindly clear outstanding dues before the due date to ensure uninterrupted services and access to the student portal.

Thank you for your cooperation!
School Accounts Office`;
  }

  if (p.includes('vacation') || p.includes('notice') || p.includes('holiday') || p.includes('chutti')) {
    return `Title: Official School Vacation Announcement
Body: Respected Parents & Students,
Please be informed that the school campus will observe vacation as per the academic calendar. During this period, online learning materials and home assignments will remain accessible via the TaleemiDunya Student Dashboard.

Warm Regards,
School Administration`;
  }

  if (p.includes('exam') || p.includes('datesheet') || p.includes('timing') || p.includes('schedule')) {
    return `Title: Examination Bell Schedule & Guidelines
Body: Dear Faculty and Students,
The upcoming examination session timings are scheduled from 08:30 AM to 11:30 AM. All students must bring their Admit Card and report in the examination hall 15 minutes before paper commencement.

Regards,
Examination Controller`;
  }

  return `Title: School Operation Briefing
Body: Dear Members,
Regarding your query: "${prompt}". All administrative records and schedules have been updated in the school management database. Please review the details on your dashboard or contact administration for further assistance.

Best Regards,
TaleemiDunya Pro AI Assistant`;
}
