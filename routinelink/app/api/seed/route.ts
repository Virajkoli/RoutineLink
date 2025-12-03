import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// Hardcoded credentials from environment
const HARDCODED_USERS = [
  {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "admin123",
    role: "admin",
  },
  {
    username: process.env.FRIEND_USERNAME || "friend",
    password: process.env.FRIEND_PASSWORD || "friend123",
    role: "friend",
  },
];

// POST /api/seed - Initialize/seed users in database
export async function POST(request: NextRequest) {
  try {
    const results = [];

    for (const userData of HARDCODED_USERS) {
      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { username: userData.username },
      });

      if (!user) {
        // Create user with hashed password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        user = await prisma.user.create({
          data: {
            username: userData.username,
            password: hashedPassword,
            role: userData.role,
          },
        });
        results.push({ username: userData.username, status: "created" });
      } else {
        results.push({ username: userData.username, status: "exists" });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Users initialized",
      data: results,
    });
  } catch (error) {
    console.error("Error seeding users:", error);
    return NextResponse.json(
      { error: "Failed to seed users" },
      { status: 500 }
    );
  }
}

// GET /api/seed - Check users status
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
      expected: HARDCODED_USERS.map((u) => u.username),
    });
  } catch (error) {
    console.error("Error checking users:", error);
    return NextResponse.json(
      { error: "Failed to check users" },
      { status: 500 }
    );
  }
}
