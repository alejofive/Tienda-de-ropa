import { redirect } from "next/navigation";
import { Shirt, LockKeyhole, ArrowRight } from "lucide-react";
import { signIn } from "@/app/actions";
import { supabaseServer } from "@/lib/supabase/server";
import { Alert } from "@/components/ui";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { data: { user } } = await (await supabaseServer()).auth.getUser();
  if (user) redirect("/");
  const { error } = await searchParams;
  return <main className="login-shell"><div className="login-left"><div className="login-brand"><Shirt size={24} /> mi tienda</div><div className="login-pitch"><span className="eyebrow">TU NEGOCIO, MÁS CLARO</span><h1>Cada prenda cuenta.<br /><em>Cada venta también.</em></h1><p>Controla tus productos, registra las ventas y lleva tus abonos en un solo lugar.</p></div><div className="login-note">Hecho para emprender a tu manera ✳</div></div><div className="login-right"><div className="login-card"><span className="login-lock"><LockKeyhole size={24} /></span><div className="eyebrow">BIENVENIDA DE NUEVO</div><h2>Entra a tu tienda</h2><p className="muted">Ingresa con tu cuenta de administrador.</p><Alert error={error} /><form action={signIn} className="login-form"><label className="field">Correo electrónico<input name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" /></label><label className="field">Contraseña<input name="password" type="password" autoComplete="current-password" required placeholder="Tu contraseña" /></label><button type="submit" className="button primary form-submit">Entrar a mi tienda <ArrowRight size={18} /></button></form><p className="login-help">Tu cuenta se crea en el panel de Supabase.</p></div></div></main>;
}
