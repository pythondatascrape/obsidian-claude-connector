export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  apiKey: string;
  systemPrompt: string;
  messages: Message[];
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

async function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

export async function streamMessage(opts: StreamOptions, attempt = 0): Promise<void> {
  const { apiKey, systemPrompt, messages, onChunk, onDone, onError } = opts;

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages,
      }),
    });
  } catch (e: any) {
    onError(`Connection lost: ${e.message}`);
    return;
  }

  if (response.status === 429) {
    if (attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
      return streamMessage(opts, attempt + 1);
    }
    onError("Rate limited — please retry manually.");
    return;
  }

  if (!response.ok) {
    const body = await response.text();
    onError(`API error ${response.status}: ${body}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) { onError("No response body"); return; }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          onChunk(parsed.delta.text);
        }
      } catch {}
    }
  }
  onDone();
}
