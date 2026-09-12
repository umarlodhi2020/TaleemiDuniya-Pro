const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'YOUR_FREE_GEMINI_API_KEY');
const schoolId = "NNRuCtHxQNjISc9EPgMs";
const queryText = "hello";

async function testGemini() {
    console.log('Testing Gemini Output...');
    const prompt = `You are the helpful official AI WhatsApp Assistant for School ID "${schoolId}" on TaleemiDunya Pro. Reply in concise polite Roman Urdu or English (matching parent's tone) to this parent query: "${queryText}" (Max 2-3 sentences). At the end of your reply, add: "(Type *menu* to see all selectable options)".`;
    
    for (let i = 0; i < 3; i++) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            console.log(`\n--- Response ${i + 1} ---`);
            console.log(response.text);
        } catch (e) {
            console.log(`\n--- Error ${i + 1} ---`);
            console.log(e.message);
            break; // If invalid key, it will fail immediately
        }
    }
}
testGemini();
