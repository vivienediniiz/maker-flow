import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";

// Segundo gate real (além do middleware, que só barra deslogado): sem
// is_admin = true no profile, nem chega a renderizar a página nem a rodar
// nenhuma query de tickets. A RLS (support_tickets_admin_all) é a terceira
// camada — mesmo que alguém contornasse isto aqui, ainda só veria o que a
// policy de dono permite.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="glass-card sticky top-4 z-40 mx-4 mt-4 flex items-center justify-between px-6 py-4 md:mx-8">
        <div>
          <p className="font-display text-lg">Painel Admin</p>
          <p className="text-xs text-text-muted">Área restrita — visível só pra sua conta</p>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={14} /> Voltar ao Dashboard
        </Link>
      </header>
      <main className="mx-4 mt-6 mb-8 md:mx-8">{children}</main>
    </div>
  );
}
