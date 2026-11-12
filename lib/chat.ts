import { GoogleGenAI } from "@google/genai";

// Lógica do chatbot compartilhada entre o servidor local (server.ts) e a Vercel (api/chat.ts).

const SYSTEM_INSTRUCTION = `Você é a "Dra. Lex", uma assistente jurídica virtual brasileira, criada para tirar dúvidas da população sobre seus direitos de forma rápida, gratuita e acessível.
- Responda sempre em português do Brasil, usando linguagem simples, acolhedora, clara e fácil de entender por pessoas de qualquer idade ou escolaridade (evite "juridiquês" desnecessário; quando usar um termo técnico, explique-o de forma simples).
- Explique os direitos com base na legislação brasileira (Constituição Federal, Código de Defesa do Consumidor, CLT, Código Civil, Estatuto do Idoso, INSS/Previdência, etc.), citando a lei ou artigo de forma didática quando ajudar.
- Organize a resposta em tópicos curtos (listas com marcadores e palavras-chave em **negrito**) para facilitar a leitura rápida.
- Ao final de casos específicos ou mais delicados, lembre com gentileza que esta é uma orientação informativa e que, para entrar com uma ação ou analisar documentos, a pessoa pode procurar um advogado ou a **Defensoria Pública** (atendimento gratuito).
- Nunca invente leis, artigos ou números de processos. Se não tiver certeza, diga com transparência.`;

let client: GoogleGenAI | null = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export interface ChatResult {
  status: number;
  body: { reply?: string; interactionId?: string; error?: string };
}

export async function chat(message: unknown, previousInteractionId?: unknown): Promise<ChatResult> {
  if (typeof message !== "string" || !message.trim()) {
    return { status: 400, body: { error: "Mensagem vazia." } };
  }
  if (message.length > 4000) {
    return { status: 400, body: { error: "Mensagem muito longa (máx. 4000 caracteres)." } };
  }

  // Lista de modelos: se um falhar (sobrecarga 503 / cota 429), tenta o próximo.
  const models = (process.env.GEMINI_MODELS || "gemini-3.8-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  // Busca do Google: exige plano com faturamento (no plano gratuito retorna 429).
  const useSearch = process.env.GEMINI_USE_SEARCH === "true";

  let ai: GoogleGenAI;
  try {
    ai = getClient();
  } catch {
    return { status: 500, body: { error: "Chave da API não configurada no servidor." } };
  }

  let lastError: any;
  for (const model of models) {
    try {
      const interaction = await ai.interactions.create(
        {
          model,
          input: message.trim(),
          system_instruction: SYSTEM_INSTRUCTION,
          ...(useSearch ? { tools: [{ type: "google_search" as const }] } : {}),
          generation_config: { max_output_tokens: 65536, thinking_level: "medium" },
          // Mantém o histórico da conversa no servidor do Gemini
          ...(typeof previousInteractionId === "string" && previousInteractionId
            ? { previous_interaction_id: previousInteractionId }
            : {}),
        },
        { timeout: 45000, maxRetries: 0 } // sem retentativas longas: passa logo para o próximo modelo
      );

      console.log(`✅ Resposta gerada com ${model}`);
      return {
        status: 200,
        body: {
          reply: interaction.output_text || "Desculpe, não consegui gerar uma resposta.",
          interactionId: interaction.id,
        },
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`⚠️  ${model} falhou: ${String(err?.message || err).slice(0, 120)}`);
    }
  }

  const msg = String(lastError?.message || "");
  const error = msg.startsWith("429")
    ? "Limite de uso da API atingido. Aguarde um minuto e tente novamente."
    : msg.startsWith("503")
      ? "Os servidores da IA estão sobrecarregados. Tente novamente em instantes."
      : "Erro ao consultar a IA. Tente novamente.";
  return { status: 500, body: { error } };
}

