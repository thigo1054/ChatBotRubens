// Servidor para desenvolvimento local (npm run dev). Na Vercel, quem responde é api/chat.ts.
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chat } from "./lib/chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Defina GEMINI_API_KEY no arquivo .env");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", async (req, res) => {
  const result = await chat(req.body?.message, req.body?.previousInteractionId);
  res.status(result.status).json(result.body);
});

app.listen(PORT, () => {
  console.log(`⚖️  Chatbot de advocacia rodando em http://localhost:${PORT}`);
});
