import { NextAuthOptions, getServerSession as nextAuthGetServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { getUserByEmail } from "@/db/repositories/users";

/**
 * Auth configuration for NextAuth.js
 * Uses Credentials provider with database-backed user authentication
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "your@email.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] Missing credentials");
          return null;
        }

        console.log("[AUTH] Attempting login for:", credentials.email);

        // Query user from database
        let user;
        try {
          user = await getUserByEmail(credentials.email);
          console.log("[AUTH] getUserByEmail result:", user ? `Found user ${user.id}` : "Not found");
        } catch (error) {
          console.error("[AUTH] Database error in getUserByEmail:", error);
          return null;
        }

        if (!user) {
          console.log("[AUTH] User not found:", credentials.email);
          return null;
        }

        // Verify password against stored hash
        console.log("[AUTH] Comparing password...");
        const isValidPassword = await compare(credentials.password, user.passwordHash);

        console.log("[AUTH] Password validation:", isValidPassword);

        if (!isValidPassword) {
          return null;
        }

        // Return user object on successful authentication
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Store user ID from database in both id and sub fields
        token.id = user.id;
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Use token.id (our custom field) or fall back to token.sub
        session.user.id = (token.id as string) || token.sub || "";
      }
      return session;
    },
  },
};

/**
 * Get the current session with user ID
 * Returns null if not authenticated
 */
export async function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}

/**
 * Get the current user ID from session
 * Throws an error if not authenticated
 */
export async function requireUserId(): Promise<string> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}
