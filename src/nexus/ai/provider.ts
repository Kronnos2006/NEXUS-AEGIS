import { chatWithGemma, ChatMessage, stripThinking } from "./gemma";
import { chatWithNemotron } from "./nemotron";

export type ModelMode = "fast" | "thinking" | "fallback";

export async function askNexus(
  messages: ChatMessage[],
  mode: ModelMode = "fast"
) {
  try {
    if (mode === "fallback") {
      return await chatWithNemotron(messages);
    }

    const response = await chatWithGemma(messages, {
      thinking: mode === "thinking",
    });

    return stripThinking(response);
  } catch (error) {
    console.warn(`Gemma failed (mode: ${mode}), falling back to Nemotron:`, error);
    try {
      return await chatWithNemotron(messages);
    } catch (fallbackError) {
      console.error("Critical: Both Gemma and Nemotron failed:", fallbackError);
      throw fallbackError;
    }
  }
}
