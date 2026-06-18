"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";

export type UserSettingsResult = { success: true } | { success: false; error: string };

export type UserSettings = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export async function getUserSettings(): Promise<UserSettings> {
  const user = await requireUser();
  const row = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  return row;
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
});

export async function updateUserProfile(
  name: string,
  email: string
): Promise<UserSettingsResult> {
  const parsed = profileSchema.safeParse({ name, email });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await requireUser();
  const normalizedEmail = parsed.data.email.toLowerCase();

  if (normalizedEmail !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        email: normalizedEmail,
      },
    });
    revalidatePath("/settings");
    return { success: true };
  } catch (e) {
    console.error("updateUserProfile", e);
    return { success: false, error: "Failed to update profile." };
  }
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export async function changeUserPassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<UserSettingsResult> {
  const parsed = passwordSchema.safeParse({ currentPassword, newPassword, confirmPassword });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await requireUser();
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.passwordHash))) {
    return { success: false, error: "Current password is incorrect." };
  }

  try {
    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return { success: true };
  } catch (e) {
    console.error("changeUserPassword", e);
    return { success: false, error: "Failed to change password." };
  }
}
