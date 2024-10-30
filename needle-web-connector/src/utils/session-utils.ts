import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSession } from "@needle-ai/needle-sdk";

export async function getSession() {
  const sessionId = cookies().get("auth_session")?.value;
  if (!sessionId) {
    redirect(`${process.env.NEEDLE_URL}/login`);
  }
  const { user, session } = await validateSession(sessionId);
  if (!user || !session) {
    redirect(`${process.env.NEEDLE_URL}/login`);
  }

  return { user, session };
}
