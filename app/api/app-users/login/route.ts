import { NextResponse } from "next/server";
import { updateLastLogin } from "@/lib/services/app-users.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { authId } = body;

    if (!authId) {
      return NextResponse.json(
        { error: "authId required" },
        { status: 400 }
      );
    }

    const user = await updateLastLogin(authId);
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
