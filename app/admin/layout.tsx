import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ArrowLeft, LayoutDashboard, MessageSquare, Users } from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/subscribers", label: "Assinantes", icon: Users },
  { href: "/admin/support", label: "Suporte", icon: MessageSquare },
];

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
        <div className="flex items-center gap-1">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-xs font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary"
            >
              <item.icon size={14} /> {item.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="ml-2 flex items-center gap-2 border-l border-border-glass pl-4 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={14} /> Voltar ao Dashboard
          </Link>
        </div>
      </header>
      <main className="mx-4 mt-6 mb-8 md:mx-8">{children}</main>
    </div>
  );
}
