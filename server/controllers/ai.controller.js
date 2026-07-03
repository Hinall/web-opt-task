import OpenAI from "openai";

export const chatBasic = async (req, res) => {
  try {
    const { messages } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const client = new OpenAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: process.env.GEMINI_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: messages,
    });

    const reply = response.choices[0]?.message?.content || "";
    res.json({ reply });
  } catch (error) {
    console.error("AI Request Failed Error:", error);
    res.status(500).json({ error: "AI request failed" });
  }
};

export const chatStream = async (req, res) => {
  try {
    const { messages } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const client = new OpenAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: process.env.GEMINI_API_KEY,
    });

    // ⚠️  Call the API BEFORE setting SSE headers so that errors like 429
    // can still be returned as proper JSON HTTP responses (not empty streams).
    const stream = await client.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: messages,
      stream: true,
    });

    // Only switch to SSE mode once we know the API call succeeded
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    for await (const chunk of stream) {
      const chunkText = chunk.choices[0]?.delta?.content;
      if (chunkText) {
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("AI Stream Request Failed Error:", error);

    if (!res.headersSent) {
      // Headers not sent yet → we can still return a proper HTTP error
      const status  = error.status === 429 ? 429 : 500;
      const message = error.status === 429
        ? "Rate limit reached. Please wait a moment and try again."
        : "AI request failed";
      return res.status(status).json({ error: message });
    }

    // Headers already sent (mid-stream error) → send SSE error event then close
    res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
    res.end();
  }
};


