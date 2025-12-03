import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

// POST /api/pusher/auth - Authenticate Pusher channel subscription
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.formData();
    const socketId = data.get("socket_id") as string;
    const channel = data.get("channel_name") as string;

    // For presence channels, include user info
    if (channel.startsWith("presence-")) {
      const presenceData = {
        user_id: session.user.id,
        user_info: {
          name: session.user.name,
          role: session.user.role,
        },
      };

      const authResponse = pusherServer.authorizeChannel(
        socketId,
        channel,
        presenceData
      );

      return NextResponse.json(authResponse);
    }

    // For private channels
    const authResponse = pusherServer.authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
    );
  }
}
