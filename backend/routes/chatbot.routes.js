// routes/chatbot.routes.js

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Lazy initialization of OpenAI client (ensures env vars are loaded)
let openai = null;
function getOpenAIClient() {
    if (!openai) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openai;
}

const AI_CHAT_ID = "ai-chatbot-genius-openai";

// System prompt for the chatbot personality
const SYSTEM_PROMPT = `You are Genius AI, a friendly, witty, and helpful assistant integrated into a professional messaging app. 
Your personality traits:
- Casual and conversational, like chatting with a smart friend
- Concise responses (keep them short and punchy unless more detail is needed)
- Use occasional emojis to add personality 😊
- Helpful and knowledgeable across many topics
- Never mention being an AI or language model unless directly asked
- Match the user's energy - if they're casual, be casual; if they're professional, be professional`;

// Helper function to validate messages array
const isValidMessage = (msg) => {
    return msg &&
        typeof msg === 'object' &&
        (msg.role === 'user' || msg.role === 'assistant') &&
        msg.content &&
        typeof msg.content === 'string' &&
        msg.content.trim().length > 0;
};

// POST /api/chatbot/ask - Handle AI chat requests
router.post('/ask', async (req, res) => {
    try {
        const { messages } = req.body;

        // Validate request
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                error: "Message history ('messages' array) is missing or empty."
            });
        }

        // Filter and validate messages
        const validMessages = messages.filter(isValidMessage);

        if (validMessages.length === 0) {
            return res.status(400).json({
                error: "No valid messages found in request."
            });
        }

        // Prepare messages for OpenAI API
        const apiMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...validMessages
        ];

        // Call OpenAI API
        const completion = await getOpenAIClient().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 300,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        });

        // Extract response
        const botReply = completion.choices[0]?.message?.content?.trim() ||
            "I couldn't generate a response. Please try again.";

        // Log for monitoring
        const lastUserMessage = validMessages[validMessages.length - 1]?.content || 'N/A';
        console.log(`[AI Chat] User: "${lastUserMessage.substring(0, 50)}..." | AI Reply: "${botReply.substring(0, 50)}..."`);

        res.json({ reply: botReply });

    } catch (error) {
        console.error(`[AI Chatbot Error - ${AI_CHAT_ID}]:`, error.message);

        // Handle specific OpenAI errors
        if (error.code === 'insufficient_quota') {
            return res.status(503).json({
                error: "AI service quota exceeded. Please try again later."
            });
        }
        if (error.code === 'invalid_api_key') {
            return res.status(500).json({
                error: "AI service configuration error."
            });
        }

        res.status(500).json({
            error: "Genius AI is taking a quick break. Please try again!"
        });
    }
});

module.exports = router;
