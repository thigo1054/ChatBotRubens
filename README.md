# ⚖️ Chatbot de Advocacia – Silva & Associados

Site de escritório de advocacia com assistente virtual (Dra. Lex) integrada à API do Google Gemini (Interactions API + Google Search).

## Como rodar

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Copie `.env.example` para `.env` e coloque sua chave do Google AI Studio:
   ```bash
   cp .env.example .env
   ```
3. Inicie:
   ```bash
   npm run dev
   ```
4. Acesse http://localhost:3000

## Estrutura

- `server.ts` – backend Express (TypeScript) que chama o Gemini. A chave fica só no servidor.
- `public/` – site (HTML, CSS, JS) com a interface do chat.

## Configuração do modelo (igual ao AI Studio)

- Modelo: `gemini-3.8-flash`
- Ferramenta: Google Search
- `thinking_level: medium`, `max_output_tokens: 65536`
- O histórico da conversa é mantido com `previous_interaction_id`.

