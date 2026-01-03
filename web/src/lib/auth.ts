import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

/**
 * Auth configuration for NextAuth.js
 * Uses Credentials provider for single-user authentication
 * Credentials are validated against environment variables
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
          return null;
        }

        const userEmail = process.env.AUTH_USER_EMAIL;
        const userPasswordHash = process.env.AUTH_USER_PASSWORD_HASH;

        if (!userEmail || !userPasswordHash) {
          console.error("AUTH_USER_EMAIL or AUTH_USER_PASSWORD_HASH not configured");
          return null;
        }

        // Check if email matches
        if (credentials.email !== userEmail) {
          return null;
        }

        // Verify password against stored hash
        const isValidPassword = await compare(credentials.password, userPasswordHash);

        if (!isValidPassword) {
          return null;
        }

        // Return user object on successful authentication
        return {
          id: "1",
          email: userEmail,
          name: "Admin",
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
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
