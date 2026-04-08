import axios from "axios";

export class NemotronService {
  private apiKey: string;
  private apiUrl: string = "https://integrate.api.nvidia.com/v1/chat/completions";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(message: string, history: any[] = [], systemInstruction: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error("NVIDIA_API_KEY no configurada.");
    }

    try {
      const messages = [
        { role: "system", content: systemInstruction },
        ...history.map(m => ({
          role: m.source === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        { role: "user", content: message }
      ];

      const response = await axios.post(
        this.apiUrl,
        {
          model: "nvidia/nemotron-4-340b-instruct",
          messages,
          temperature: 0.5,
          top_p: 1,
          max_tokens: 1024,
        },
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
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
}
