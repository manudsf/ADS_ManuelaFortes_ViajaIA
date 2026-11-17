import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import CampoData from "../components/CampoData.jsx";
import { paraIso } from "../utils/data.js";

export default function NovaViagem() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: "", destino: "", dataInicio: "", dataFim: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    // Datas são opcionais: só valida se a pessoa preencheu algo.
    const dataInicio = form.dataInicio ? paraIso(form.dataInicio) : null;
    const dataFim = form.dataFim ? paraIso(form.dataFim) : null;

    if (form.dataInicio && !dataInicio) {
      setErro("A data de ida está inválida. Use o formato dd/mm/aaaa, por exemplo 20/12/2026.");
      return;
    }
    if (form.dataFim && !dataFim) {
      setErro("A data de volta está inválida. Use o formato dd/mm/aaaa, por exemplo 23/12/2026.");
      return;
    }
    if (dataInicio && dataFim && dataFim < dataInicio) {
      setErro("A data de volta não pode ser antes da data de ida.");
      return;
    }

    setCarregando(true);
    try {
      const viagem = await api.criarViagem({
        nome: form.nome,
        destino: form.destino || undefined,
        dataInicio: dataInicio ?? undefined,
        dataFim: dataFim ?? undefined,
      });
      navigate(`/viagens/${viagem.id}`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <Link to="/viagens" className="text-sm font-bold text-accent">
          ← Voltar para minhas viagens
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-turq">Nova aventura</p>
          <h1 className="mt-2 font-display text-6xl leading-none text-ink">Qual é a próxima?</h1>
          <p className="mt-4 text-base text-muted">
            Dê um nome para a viagem. Se já souber o destino, conte também: a IA começa a conversa sabendo para onde vão.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6 rounded-3xl border border-line bg-card p-8">
            <label className="block text-sm font-medium text-ink">
              Nome da viagem
              <input
                required
                placeholder="Ex: Férias da galera 2027"
                value={form.nome}
                onChange={(e) => atualizar("nome", e.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted"
              />
            </label>

            <label className="block text-sm font-medium text-ink">
              Já tem destino em mente? <span className="font-normal text-muted">(opcional)</span>
              <input
                placeholder="Ex: Fernando de Noronha"
                value={form.destino}
                onChange={(e) => atualizar("destino", e.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <CampoData
                label={<>Ida <span className="font-normal text-muted">(opcional)</span></>}
                value={form.dataInicio}
                onChange={(v) => atualizar("dataInicio", v)}
              />
              <CampoData
                label={<>Volta <span className="font-normal text-muted">(opcional)</span></>}
                value={form.dataFim}
                onChange={(v) => atualizar("dataFim", v)}
              />
            </div>

            {erro && (
              <p role="alert" className="text-sm font-medium text-accent">
                {erro}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <p className="text-sm text-muted">Você vira o admin e pode convidar a turma depois.</p>
              <button
                type="submit"
                disabled={carregando}
                className="rounded-full bg-accent px-8 py-3 font-bold text-on-accent shadow-lg shadow-accent/30 disabled:opacity-60"
              >
                {carregando ? "Criando..." : "Criar viagem"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </main>
  );
}