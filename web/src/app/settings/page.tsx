import { redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/settings-view";
import { getServerSession } from "@/lib/auth";
import { getUserById } from "@/db/repositories/users";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await getUserById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  return (
    <SettingsView
      user={{
        email: user.email,
        name: user.name ?? "",
      }}
    />
  );
}
