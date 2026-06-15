"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  clearSessionCookie,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { createWorkspace } from "@/lib/workspace";

export type AuthActionResult =
  | { success: true }
  | { success: false; error: string };

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  agreeMarketing: z.boolean().optional(),
});

export async function login(
  email: string,
  password: string,
  nextPath?: string
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true, passwordHash: true },
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { success: false, error: "Invalid email or password." };
  }

  await setSessionCookie(user.id);
  redirect(nextPath && nextPath.startsWith("/") ? nextPath : "/");
}

export async function register(
  name: string,
  email: string,
  password: string,
  agreeMarketing?: boolean
): Promise<AuthActionResult> {
  // Honeypot: bots often check every checkbox; humans never see this field.
  if (agreeMarketing) {
    return { success: true };
  }

  const parsed = registerSchema.safeParse({ name, email, password, agreeMarketing });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: normalizedEmail,
      passwordHash,
    },
    select: { id: true },
  });

  await createWorkspace("Default", user.id);
  await setSessionCookie(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
