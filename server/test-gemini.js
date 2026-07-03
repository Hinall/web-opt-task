import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const response = await client.chat.completions.create({
  model: "gemini-2.5-flash",
  messages: [{ role: "user", content: "Say hello in one sentence." }],
});

console.log(response.choices[0].message.content);