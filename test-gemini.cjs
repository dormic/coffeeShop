const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY
  });
  
  const modelsToTest = ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-3.0-flash", "gemini-3.1-flash", "gemini-3.1-pro-preview"];
  for (const m of modelsToTest) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: "Hello",
      });
      console.log(`${m} works:`, res.text);
    } catch (e) {
      console.log(`${m} error:`, e.message);
    }
  }
}
test();
