// Função serverless da Vercel: responde em /api/chat
import { chat } from "../lib/chat.js";

// Tempo máximo da função (segundos): dá tempo de tentar todos os modelos
export const maxDuration = 150;

export async function POST(request: Request) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  const result = await chat(body?.message, body?.previousInteractionId);
  return Response.json(result.body, { status: result.status });
}
