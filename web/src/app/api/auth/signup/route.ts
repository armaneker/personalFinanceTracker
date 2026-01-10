import { z } from "zod";
import { hash } from "bcryptjs";

import { getUserByEmail, createUser } from "@/db/repositories/users";
import { errorResponse, validateRequestBody, createdResponse } from "@/lib/api-utils";
import { ErrorFactory } from "@/lib/errors";
import { generateUserId } from "@/lib/ids";

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").optional(),
});

export async function POST(request: Request) {
  try {
    const { email, password, name } = await validateRequestBody(request, signupSchema);

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      throw ErrorFactory.duplicate("A user with this email already exists");
    }

    // Hash the password with 10 rounds
    const passwordHash = await hash(password, 10);

    // Create the new user
    const newUser = await createUser({
      id: generateUserId(),
      email,
      passwordHash,
      name: name ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Return user without password hash
    return createdResponse({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
