const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: 'AIzaSyCw881mp9p5yXS2sty_r9xAswm57SPr-4g' });

(async () => {
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Hello, world!'
    });
    console.log("Success:", response.text);
  } catch (err) {
    console.error("Gemini Error:", err);
  }
})();
