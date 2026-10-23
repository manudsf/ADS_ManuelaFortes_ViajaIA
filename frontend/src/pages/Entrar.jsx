import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import FundoViagens from "../components/FundoViagens.jsx";

export default function Entrar() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await entrar(email, senha);
      navigate("/viagens");
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-6">
        <FundoViagens />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-3xl border border-line bg-panel/55 p-10 shadow-2xl shadow-black/30 backdrop-blur-xl"
      >
        <h2 className="font-display text-2xl text-ink">Bem vindo de volta, viajante! Pronto para mais uma aventura? </h2>

        <label className="block text-sm font-medium text-ink">
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink"
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Senha
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink"
          />
        </label>

        {erro && (
          <p role="alert" className="text-sm text-accent">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-full bg-accent py-3 font-bold text-on-accent disabled:opacity-60"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link to="/cadastro" className="font-bold text-ink">
            Cadastre-se
          </Link>
        </p>
      </form>
    </main>
  );
}