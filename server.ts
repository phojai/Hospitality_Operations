import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Database Storage Setup
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'database.json');

function ensureDbExists() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ rooms: null, bookings: [], guests: [] }, null, 2), 'utf-8');
  }
}

function readDb() {
  ensureDbExists();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return { rooms: null, bookings: [], guests: [] };
  }
}

function writeDb(data: any) {
  ensureDbExists();
  try {
    const existing = readDb();
    const updated = {
      rooms: data.rooms !== undefined ? data.rooms : existing.rooms,
      bookings: data.bookings !== undefined ? data.bookings : existing.bookings,
      guests: data.guests !== undefined ? data.guests : existing.guests
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (e) {
    console.error('Failed to write database file:', e);
    throw e;
  }
}

// Database API Routes
app.get('/api/db', (req, res) => {
  try {
    const db = readDb();
    return res.json({ success: true, data: db });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/db', (req, res) => {
  try {
    const updated = writeDb(req.body);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/db/bookings', (req, res) => {
  try {
    const updated = writeDb({ bookings: [], guests: [] });
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Telegram Notification API Endpoint
app.post('/api/telegram/send', async (req, res) => {
  try {
    const { botToken, chatId, text, parseMode } = req.body;

    const activeBotToken = botToken || process.env.TELEGRAM_BOT_TOKEN;
    const activeChatId = chatId || process.env.TELEGRAM_CHAT_ID;

    if (!activeBotToken || !activeChatId) {
      return res.status(400).json({
        success: false,
        error: 'Telegram Bot Token or Chat ID not configured. Please enter your Telegram Bot Token & Chat ID in the Housekeeping Telegram Settings.'
      });
    }

    const telegramUrl = `https://api.telegram.org/bot${activeBotToken.trim()}/sendMessage`;
    const payload = {
      chat_id: activeChatId.trim(),
      text,
      parse_mode: parseMode || 'HTML'
    };

    const telegramRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await telegramRes.json();

    if (!data.ok) {
      console.error('Telegram API error response:', data);
      let friendlyError = data.description || 'Failed to send Telegram message';

      if (friendlyError.includes("bot can't send messages to the bot")) {
        friendlyError = "Invalid Chat ID: You entered the Bot's own ID as the Chat ID. A Telegram bot cannot message itself. Please enter your personal Telegram Chat ID (from @userinfobot) or your Housekeeping Group ID (e.g., -100...).";
      } else if (friendlyError.includes("bot was blocked by the user") || friendlyError.includes("Forbidden")) {
        friendlyError = "Bot Blocked or Not Started: Please open your Telegram app, search for your bot, and tap 'Start' (/start) so it has permission to send you messages.";
      } else if (friendlyError.includes("chat not found")) {
        friendlyError = "Chat Not Found: Please start a chat with your bot first or add the bot to your Telegram group.";
      }

      return res.status(400).json({
        success: false,
        error: friendlyError
      });
    }

    return res.json({
      success: true,
      message: 'Housekeeping reminder sent to Telegram successfully!',
      result: data.result
    });
  } catch (error: any) {
    console.error('Telegram dispatch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Error contacting Telegram API: ' + error.message
    });
  }
});

// Server-side Gemini initialization
const getGeminiClient = (customApiKey?: string) => {
  const apiKey = (customApiKey && customApiKey.trim().length > 0) ? customApiKey.trim() : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

// API Route: AI Reservation Assistant & Query Handler
app.post('/api/ai/assistant', async (req, res) => {
  try {
    const { prompt, rooms, bookings, currentDate, apiKey } = req.body;

    const ai = getGeminiClient(apiKey);
    if (!ai) {
      return res.status(200).json({
        reply: "🔑 **Gemini API Key missing**: Please enter your Gemini API key in the AI Assistant settings above or set `GEMINI_API_KEY` in environment variables.",
        actionDraft: null
      });
    }

    // Sanitize and compact room data to minimize token consumption
    const compactRooms = (rooms || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      pricePerNight: r.pricePerNight,
      maxCapacity: r.maxCapacity,
      status: r.status,
      amenities: Array.isArray(r.amenities) ? r.amenities.slice(0, 4) : []
    }));

    // Sanitize and compact active/recent bookings
    const compactBookings = (bookings || []).slice(-30).map((b: any) => ({
      id: b.id,
      roomId: b.roomId,
      roomName: b.roomName,
      guestName: b.guestName,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
      totalAmount: b.totalAmount
    }));

    const systemInstruction = `
You are the AI Reservation & Property Management Assistant for "Nohshring Homestay".
Current Local Date: ${currentDate || new Date().toISOString().split('T')[0]}

YOUR ROLE:
- Assist property owners and staff with room availability, reservations, pricing, revenue insights, and WhatsApp/phone inquiry parsing.
- Always check live room inventory and current bookings before answering.
- Never double book rooms.
- Be concise, helpful, polite, and accurate.

COMPACT ROOM INVENTORY:
${JSON.stringify(compactRooms)}

RECENT & ACTIVE BOOKINGS:
${JSON.stringify(compactBookings)}

TASK:
1. Answer the user prompt directly and politely.
2. If the user query is a booking request or WhatsApp message inquiry (e.g. "I want to book Bamboo Cottage for 2 guests from Aug 10 to Aug 13"), parse all details and present a structured summary with room recommendation and price calculation.
3. If rooms are unavailable for requested dates, explain why and recommend alternative available dates or room types.
    `;

    // Try primary model (gemini-2.5-flash) first, fallback to gemini-3.6-flash if needed
    let response;
    const primaryModel = 'gemini-2.5-flash';
    const fallbackModel = 'gemini-3.6-flash';

    try {
      response = await ai.models.generateContent({
        model: primaryModel,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });
    } catch (primaryErr: any) {
      console.warn(`Primary model ${primaryModel} failed (${primaryErr.message}), attempting fallback to ${fallbackModel}...`);
      response = await ai.models.generateContent({
        model: fallbackModel,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });
    }

    const replyText = response.text || "I am unable to process the request right now.";

    return res.json({
      reply: replyText
    });
  } catch (error: any) {
    console.error('AI Assistant Error:', error);
    let rawMsg = error.message || String(error);
    let userFriendlyReply = `⚠️ **AI Query Error**: ${rawMsg}`;

    if (rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('429') || rawMsg.includes('quota')) {
      userFriendlyReply = `⏳ **API Rate Limit Reached (429)**\n\nThe free tier request limit was temporarily reached. Please wait **10-15 seconds** and try your question again.\n\n*Tip:* You can also click the 🔑 key icon in the drawer header to enter your personal Gemini API key for higher rate limits.`;
    } else if (rawMsg.includes('API key not valid') || rawMsg.includes('API_KEY_INVALID')) {
      userFriendlyReply = `🔑 **Invalid Gemini API Key**: The provided API key was rejected by Google Gemini. Please check your key in settings.`;
    }

    return res.status(200).json({
      reply: userFriendlyReply
    });
  }
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Homestay Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
