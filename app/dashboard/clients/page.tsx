"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { NewClientModal } from "@/components/dashboard/NewClientModal";
import { ClientDetailModal } from "@/components/dashboard/ClientDetailModal";
import { WhatsAppLink } from "@/components/ui/WhatsAppLink";
import { InstagramLink } from "@/components/ui/InstagramLink";
import { useSubscription } from "@/components/dashboard/SubscriptionContext";
import { createClient } from "@/lib/supabase/client";
import { canCreateMore, limitFor } from "@/lib/entitlements";
import { Search, Plus, Loader2, Trash2, Lock, Pencil } from "lucide-react";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const supabase = createClient();
  const { tier } = useSubscription();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const canCreate = canCreateMore(tier, "clients", clients.length);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setClients((data as Client[]) ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Remover este cliente?")) return;
    await supabase.from("clients").delete().eq("id", id);
    setClients((prev) => prev.filter((c) => c.id !== id));
  }

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <Topbar title="Clientes" />
      <main className="space-y-6 px-6 py-8 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="glass-card flex items-center gap-2 px-4 py-2.5 sm:w-80">
            <Search size={15} className="text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente por nome, telefone ou e-mail..."
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>
          <NeonButton
            onClick={() => canCreate && setModalOpen(true)}
            disabled={!canCreate}
            className={!canCreate ? "opacity-40" : undefined}
            title={!canCreate ? `Limite do plano Grátis (${limitFor(tier, "clients")} clientes) atingido` : undefined}
          >
            {canCreate ? <Plus size={16} /> : <Lock size={16} />} Novo Cliente
          </NeonButton>
        </div>

        {!canCreate && (
          <p className="text-xs text-amber-400">
            Você atingiu o limite de {limitFor(tier, "clients")} clientes do plano Grátis.{" "}
            <a href="/dashboard/subscription" className="underline hover:text-amber-300">
              Assine um plano
            </a>{" "}
            pra cadastrar sem limite.
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-text-muted">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <GlassCard padding="lg" className="text-center text-sm text-text-muted">
            {clients.length === 0
              ? 'Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" pra começar.'
              : "Nenhum cliente encontrado para essa busca."}
          </GlassCard>
        ) : (
          <GlassCard padding="none" className="overflow-hidden">
            <div className="overflow-x-auto scrollbar-glass">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-glass text-xs uppercase tracking-wide text-text-muted">
                    <th className="px-6 py-4 font-medium">Nome</th>
                    <th className="px-6 py-4 font-medium">Telefone</th>
                    <th className="px-6 py-4 font-medium">E-mail</th>
                    <th className="px-6 py-4 font-medium">Endereço</th>
                    <th className="px-6 py-4 font-medium">Observações</th>
                    <th className="w-12 px-4 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedClient(c)}
                      className="cursor-pointer border-b border-border-glass/60 transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-6 py-4 font-medium text-text-primary">{c.name}</td>
                      <td className="px-6 py-4 text-text-secondary">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          {c.phone ? <WhatsAppLink phone={c.phone} /> : "—"}
                          {c.instagram && <InstagramLink handle={c.instagram} />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{c.email || "—"}</td>
                      <td className="max-w-[220px] truncate px-6 py-4 text-text-secondary">{c.address || "—"}</td>
                      <td className="max-w-[220px] truncate px-6 py-4 text-text-muted">{c.notes || "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingClient(c);
                            }}
                            className="text-text-muted hover:text-neon-pink"
                            aria-label="Editar cliente"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={(e) => handleDelete(c.id, e)}
                            className="text-text-muted hover:text-red-400"
                            aria-label="Remover cliente"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </main>

      <NewClientModal
        open={modalOpen || !!editingClient}
        onClose={() => {
          setModalOpen(false);
          setEditingClient(null);
        }}
        client={editingClient}
        onCreated={(client) =>
          setClients((prev) =>
            editingClient ? prev.map((c) => (c.id === client.id ? client : c)) : [client, ...prev]
          )
        }
      />
      <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
    </>
  );
}