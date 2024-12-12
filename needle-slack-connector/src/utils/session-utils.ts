import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { validateSession } from "@needle-ai/needle-sdk";

export async function getSession() {
  const sessionId = cookies().get("auth_session")?.value;
  if (!sessionId) {
    redirect(`/unauthorized`);
  }
  const { user, session } = await validateSession(sessionId);
  if (!user || !session) {
    redirect(`/unauthorized`);
  }

  return { user, session };
}
