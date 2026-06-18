import { getUserSettings } from "@/app/actions/user-settings";
import { appTitle } from "@/lib/brand";
import { UserSettingsForm } from "./UserSettingsForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: appTitle("Settings"),
  description: "Manage your Pipelio account settings",
};

export default async function SettingsPage() {
  const user = await getUserSettings();

  return (
    <UserSettingsForm
      user={{
        ...user,
        createdAt: user.createdAt.toISOString(),
      }}
    />
  );
}
