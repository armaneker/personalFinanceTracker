import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { getUserById, updateUserPassword } from "@/db/repositories/users";
import { errorResponse, validateRequestBody, successResponse } from "@/lib/api-utils";
import { requireUserId } from "@/lib/auth";
import { ErrorFactory } from "@/lib/errors";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const { currentPassword, newPassword } = await validateRequestBody(
      request,
      changePasswordSchema
    );

    const user = await getUserById(userId);
    if (!user) {
      throw ErrorFactory.notFound("User not found");
    }

    const isValidPassword = await compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw ErrorFactory.unauthorized("Current password is incorrect");
    }

    const passwordHash = await hash(newPassword, 12);
    await updateUserPassword(userId, passwordHash);

    return successResponse({ message: "Password changed successfully" });
  } catch (error) {
    return errorResponse(error);
  }
}
