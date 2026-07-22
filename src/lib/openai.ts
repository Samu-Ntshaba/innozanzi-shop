import OpenAI from "openai";

let client: OpenAI | undefined;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY must be configured");
  }

  client ??= new OpenAI({ apiKey });
  return client;
}
