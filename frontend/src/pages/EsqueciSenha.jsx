import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import FundoViagens from "../components/FundoViagens.jsx";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await api.esqueciSenha(email);
      setEnviado(true);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-6">
      <FundoViagens />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-line bg-panel/80 p-10 shadow-2xl shadow-black/30 backdrop-blur-xl"
      >
        {enviado ? (
          <>
            <p className="font-display text-4xl text-ink">Confira seu e-mail</p>
            <p className="mt-3 text-muted">
              Se o endereço estiver cadastrado, o link para criar uma nova senha já está a caminho. Ele vale por 1 hora.
            </p>
            <Link to="/entrar" className="mt-8 inline-block font-bold text-accent">
              Voltar para o login
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <h1 className="font-display text-5xl text-ink">Esqueceu a senha?</h1>
            <p className="text-muted">Sem problemas. Informe seu e-mail e a gente manda um link para criar uma nova.</p>

            <label className="block text-sm font-medium text-ink">
              E-mail
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted"
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
              {carregando ? "Enviando..." : "Enviar link"}
            </button>

            <p className="text-sm">
              <Link to="/entrar" className="font-bold text-ink">
                Voltar para o login
              </Link>
            </p>
          </form>
        )}
      </motion.div>
    </main>
  );
}