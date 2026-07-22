import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 20_000;

function isAuthorized(request: Request) {
  const expected = process.env.OPENAI_ROUTE_SECRET;
  const authorization = request.headers.get("authorization");
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!expected || !supplied) return false;

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);

  return (
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const input =
      typeof body === "object" && body !== null && "input" in body
        ? (body as { input?: unknown }).input
        : undefined;

    if (typeof input !== "string" || !input.trim()) {
      return NextResponse.json(
        { error: "A non-empty string input is required." },
        { status: 400 },
      );
    }

    if (input.length > MAX_INPUT_LENGTH) {
      return NextResponse.json(
        { error: `Input cannot exceed ${MAX_INPUT_LENGTH} characters.` },
        { status: 400 },
      );
    }

    const response = await getOpenAIClient().responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      input: input.trim(),
      max_output_tokens: 1_000,
      store: false,
    });

    return NextResponse.json({
      id: response.id,
      output: response.output_text,
    });
  } catch (error) {
    console.error("OpenAI request failed", error);
    return NextResponse.json(
      { error: "The AI request could not be completed." },
      { status: 500 },
    );
  }
}
