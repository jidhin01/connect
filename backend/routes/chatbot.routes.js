// routes/chatbot.routes.js

const express = require('express');
const router = express.Router();

// 1. Import the configured Gemini client (AIChatHistory model import is REMOVED)
const { ai } = require('../config/gemini');

const AI_CHAT_ID = "ai-chatbot-genius-gemini"; 

// Helper function to validate a Gemini content part
const isValidPart = (part) => {
    return part && part.parts && Array.isArray(part.parts) && part.parts.length > 0 && part.parts[0].text && part.parts[0].text.trim().length > 0;
};

// 🛑 REMOVE: The router.get('/history') function is removed entirely.

// 2. Define the POST route to handle AI chat requests
router.post('/ask', async (req, res) => {
  try {
    // 💡 REVERT: Expect the 'contents' array (history + new message) from the frontend
    const { contents } = req.body; 

    // A. Check if the conversation history is present and valid
    if (!contents || !Array.isArray(contents) || contents.length === 0) {
        return res.status(400).json({ error: "Conversation history ('contents' array) is missing or empty." });
    }

    // 💡 Validate and filter out any malformed history items
    const validatedContents = contents.filter(item => {
        // Ensure the item has a valid role and at least one valid part
        return item.role && (item.role === 'user' || item.role === 'model') && isValidPart(item);
    });

    // Check if the validated array is now empty (meaning input was all junk)
    if (validatedContents.length === 0) {
        return res.status(400).json({ error: "No valid message history found in request." });
    }

    // B. Define the bot's casual personality (System Instruction)
    const systemInstruction = "You are a friendly, casual, and witty assistant named Genius AI, integrated into a professional messaging app portfolio project. Keep your responses short, casual, and fun, like a peer in a chat. Do not mention that you are an AI or a language model unless specifically asked.";

    // C. Call the Gemini API to generate content
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", 
        // 💡 Use the validated and cleaned 'validatedContents' array sent by the client
        contents: validatedContents, 
        config: {
            systemInstruction: systemInstruction, 
            temperature: 0.7, 
            maxOutputTokens: 150 
        }
    });

    // D. Extract the response and send it back to the React frontend
    const botReply = response.text.trim();
    
    // Optional: Log the new message and AI's response for backend monitoring
    const lastUserMessage = validatedContents[validatedContents.length - 1].parts[0].text;
    console.log(`[AI Chat] User: "${lastUserMessage}" | AI Reply: "${botReply}"`);

    // E. NO DATABASE SAVING HAPPENS HERE.
    
    res.json({ reply: botReply });
    
  } catch (error) {
    // F. Log the full error object for debugging
    console.error(`[AI Chatbot Error - ${AI_CHAT_ID}]:`, error); 
    if (error.response) {
        console.error("API Response Status:", error.response.status);
        console.error("API Response Data:", error.response.data);
    }
    
    res.status(500).json({ error: "Sorry, Genius AI is currently busy. Please try again in a moment." });
  }
});

module.exports = router;
