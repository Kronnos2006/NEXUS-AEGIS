const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

const DEFAULT_MODEL =
  process.env.PRIMARY_LLM ?? "gemma4:e2b";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function chatWithGemma(
  messages: ChatMessage[],
  options?: {
    model?: string;
    thinking?: boolean;
  }
) {
  const model = options?.model ?? DEFAULT_MODEL;

  const preparedMessages = messages.map((msg) => ({ ...msg }));

  // Gemma 4 soporta thinking mode; se activa con el token <|think|> al inicio del system prompt.
  if (options?.thinking) {
    const systemIndex = preparedMessages.findIndex((m) => m.role === "system");
    if (systemIndex >= 0 && !preparedMessages[systemIndex].content.startsWith("<|think|>")) {
      preparedMessages[systemIndex].content = `<|think|>\n${preparedMessages[systemIndex].content}`;
    } else if (systemIndex < 0) {
      preparedMessages.unshift({ role: "system", content: "<|think|>" });
    }
  }

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: preparedMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemma error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data?.message?.content ?? "";
  } catch (error) {
    console.error("Error connecting to Ollama/Gemma:", error);
    throw error;
  }
}

export function stripThinking(text: string) {
  // Gemma 4 thinking tags might vary, but user suggested this regex
  // Also adding common thinking tags just in case
  return text
    .replace(/<\|channel\>thought[\s\S]*?<\|channel\|>/g, "")
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .trim();
}
