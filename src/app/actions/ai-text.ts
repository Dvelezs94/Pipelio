"use server";

import { improveText } from "@/lib/deepseek";

export type AiTextResult = { success: true; text: string } | { success: false; error: string };

export async function improveTextWithAi(
  text: string,
  options?: { context?: string; userPrompt?: string }
): Promise<AiTextResult> {
  const result = await improveText({
    text,
    context: options?.context,
    userPrompt: options?.userPrompt,
  });
  if (!result.ok) return { success: false, error: result.error };
  return { success: true, text: result.text };
}
