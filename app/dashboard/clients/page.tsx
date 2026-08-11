"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { GlassCard } from "@/components/ui/GlassCard";
import { NeonButton } from "@/components/ui/NeonButton";
import { NewClientModal } from "@/components/dashboard/NewClientModal";
import { ClientDetailModal } from "@/components/dashboard/ClientDetailModal";
import { createClient } from "@/lib/supabase/client";
import { Search, Plus, Loader2, Trash2 } from "lucide-react";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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
          <NeonButton onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Novo Cliente
          </NeonButton>
        </div>

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <GlassCard
                key={c.id}
                hover
                padding="md"
                className="group relative cursor-pointer space-y-1"
                onClick={() => setSelectedClient(c)}
              >
                <p className="text-sm font-medium text-text-primary">{c.name}</p>
                <p className="text-xs text-text-muted">{c.phone || c.email || "Sem contato"}</p>
                {c.address && <p className="truncate text-[11px] text-text-muted/70">{c.address}</p>}
                <button
                  onClick={(e) => handleDelete(c.id, e)}
                  className="absolute right-3 top-3 text-text-muted opacity-0 hover:text-red-400 group-hover:opacity-100"
                  aria-label="Remover cliente"
                >
                  <Trash2 size={13} />
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </main>

      <NewClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(client) => setClients((prev) => [client, ...prev])}
      />
      <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
    </>
  );
}