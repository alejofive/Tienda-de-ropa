import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Nav } from "@/components/nav";
import { signOut } from "@/app/actions";
import { supabaseServer } from "@/lib/supabase/server";
import { ActionForm, SubmitButton } from "@/components/action-form";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  if (!user) redirect("/login");
  return <div className="app-shell"><Nav /><div className="app-content"><header className="topbar"><span>Tu negocio en orden <span className="sparkle">✳</span></span><ActionForm action={signOut}><SubmitButton className="signout" type="submit" title="Cerrar sesión" pendingLabel="Saliendo…"><span>{user.email}</span><LogOut size={17} /></SubmitButton></ActionForm></header><main className="page">{children}</main></div></div>;
}
