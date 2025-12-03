import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Hardcoded credentials from environment
const HARDCODED_USERS = {
  admin: {
    username: process.env.ADMIN_USERNAME || "myname",
    password: process.env.ADMIN_PASSWORD || "mystrongpass",
    role: "admin",
  },
  friend: {
    username: process.env.FRIEND_USERNAME || "friend",
    password: process.env.FRIEND_PASSWORD || "friendpass",
    role: "friend",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = credentials.username as string;
        const password = credentials.password as string;

        // Check against hardcoded credentials
        const adminUser = HARDCODED_USERS.admin;
        const friendUser = HARDCODED_USERS.friend;

        let matchedRole: string | null = null;

        if (
          username === adminUser.username &&
          password === adminUser.password
        ) {
          matchedRole = "admin";
        } else if (
          username === friendUser.username &&
          password === friendUser.password
        ) {
          matchedRole = "friend";
        }

        if (!matchedRole) {
          return null;
        }

        // Find or create user in database
        let user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user) {
          // Create user with hashed password
          const hashedPassword = await bcrypt.hash(password, 10);
          user = await prisma.user.create({
            data: {
              username,
              password: hashedPassword,
              role: matchedRole,
            },
          });
          console.log(`Created user: ${username} with id: ${user.id}`);
        } else {
          console.log(`Found existing user: ${username} with id: ${user.id}`);
        }

        return {
          id: user.id,
          name: user.username,
          email: `${user.username}@routinelink.local`,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});

// Helper to check if user is admin
export function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

// Helper to get current user from session
export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}
