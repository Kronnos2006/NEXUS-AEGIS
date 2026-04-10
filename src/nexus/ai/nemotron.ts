import axios from "axios";
import { ChatMessage } from "./gemma";

const NEMOTRON_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NEMOTRON_MODEL = "nvidia/nemotron-4-340b-instruct";

export async function chatWithNemotron(messages: ChatMessage[]) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY no configurada.");
  }

  try {
    const response = await axios.post(
      NEMOTRON_API_URL,
      {
        model: NEMOTRON_MODEL,
        messages,
        temperature: 0.5,
        top_p: 1,
        max_tokens: 1024,
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error en Nemotron API:", error);
    throw error;
  }
}
