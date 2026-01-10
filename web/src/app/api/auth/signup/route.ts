import { z } from "zod";
import { hash } from "bcryptjs";

import { getUserByEmail, createUser } from "@/db/repositories/users";
import { errorResponse, validateRequestBody, createdResponse } from "@/lib/api-utils";
import { ErrorFactory, ErrorCode, AppError } from "@/lib/errors";
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
    let newUser;
    try {
      newUser = await createUser({
        id: generateUserId(),
        email,
        passwordHash,
        name: name ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (createError) {
      // Convert database errors to user-friendly errors
      const message = createError instanceof Error ? createError.message : String(createError);

      // Check for specific database errors
      if (message.includes("schema") || message.includes("column")) {
        throw ErrorFactory.databaseError(
          "Unable to create account due to a database configuration issue. Please contact support.",
          { originalError: message }
        );
      }

      if (message.includes("UNIQUE constraint") || message.includes("duplicate")) {
        throw ErrorFactory.duplicate("A user with this email already exists");
      }

      throw new AppError(
        "Failed to create user account. Please try again.",
        ErrorCode.DATABASE_ERROR,
        500,
        { originalError: message }
      );
    }

    // Verify the user was actually created
    if (!newUser || !newUser.id) {
      throw ErrorFactory.databaseError(
        "User account creation failed. Please try again."
      );
    }

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
