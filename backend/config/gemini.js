// config/gemini.js

const { GoogleGenAI } = require('@google/genai'); 

// Make sure dotenv is loaded in your server.js main file
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); 

module.exports = { ai };