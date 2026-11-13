import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import FundoViagens from "../components/FundoViagens.jsx";

export default function RedefinirSenha() {
  const { token } = useParams();
  const [form, setForm] = useState({ novaSenha: "", confirmacao: "" });
  const [carregando, setCarregando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");

    if (form.novaSenha !== form.confirmacao) {
      setErro("A confirmação não bate com a nova senha.");
      return;
    }

    setCarregando(true);
    try {
      await api.redefinirSenha(token, form.novaSenha);
      setConcluido(true);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  const campo = "mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted";

  return (
    <main className="relative grid min-h-screen place-items-center px-6">
      <FundoViagens />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-line bg-panel/80 p-10 shadow-2xl shadow-black/30 backdrop-blur-xl"
      >
        {concluido ? (
          <>
            <p className="font-display text-4xl text-ink">Senha atualizada!</p>
            <p className="mt-3 text-muted">Pode entrar com a senha nova.</p>
            <Link
              to="/entrar"
              className="mt-8 inline-block rounded-full bg-accent px-8 py-3 font-bold text-on-accent"
            >
              Ir para o login
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <h1 className="font-display text-5xl text-ink">Nova senha</h1>
            <p className="text-muted">Escolha uma senha com pelo menos 8 caracteres.</p>

            <label className="block text-sm font-medium text-ink">
              Nova senha
              <input
                type="password"
                required
                minLength={8}
                value={form.novaSenha}
                onChange={(e) => setForm({ ...form, novaSenha: e.target.value })}
                className={campo}
              />
            </label>

            <label className="block text-sm font-medium text-ink">
              Confirmar nova senha
              <input
                type="password"
                required
                minLength={8}
                value={form.confirmacao}
                onChange={(e) => setForm({ ...form, confirmacao: e.target.value })}
                className={campo}
              />
            </label>

            {erro && (
              <p role="alert" className="text-sm font-medium text-accent">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="w-full rounded-full bg-accent py-3 font-bold text-on-accent disabled:opacity-60"
            >
              {carregando ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}
      </motion.div>
    </main>
  );
}