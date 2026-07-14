const { GoogleGenAI } = require("@google/genai");

async function test() {
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY
  });
  
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash", // checking fallback
      contents: "Hello",
    });
    console.log("works:", res.text);
  } catch (e) {
    console.log("error:", e.message);
  }
}
test();
