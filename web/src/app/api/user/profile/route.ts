import { z } from "zod";
import { getUserById, updateUser } from "@/db/repositories/users";
import { errorResponse, validateRequestBody, successResponse } from "@/lib/api-utils";
import { requireUserId } from "@/lib/auth";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
});

export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return successResponse({
      user: {
        email: user.email,
        name: user.name ?? "",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await requireUserId();
    const { name } = await validateRequestBody(request, updateProfileSchema);

    const updatedUser = await updateUser(userId, { name });
    if (!updatedUser) {
      throw new Error("User not found");
    }

    return successResponse({
      user: {
        email: updatedUser.email,
        name: updatedUser.name ?? "",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
