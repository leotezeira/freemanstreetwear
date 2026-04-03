import { NextResponse } from "next/server";
import { createOrUpdateAppUser } from "@/lib/services/app-users.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { authId, email } = body;

    if (!authId || !email) {
      return NextResponse.json(
        { error: "authId and email required" },
        { status: 400 }
      );
    }

    const user = await createOrUpdateAppUser(authId, email);
    return NextResponse.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
