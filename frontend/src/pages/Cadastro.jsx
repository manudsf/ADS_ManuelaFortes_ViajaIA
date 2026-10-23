import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import FundoViagens from "../components/FundoViagens.jsx";
export default function Cadastro() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: "", email: "", senha: "", telefone: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      await api.cadastro(form);
      await entrar(form.email, form.senha);
      navigate("/viagens");
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  const campos = [
    { nome: "nome", rotulo: "Nome", tipo: "text", obrigatorio: true },
    { nome: "email", rotulo: "E-mail", tipo: "email", obrigatorio: true },
    { nome: "senha", rotulo: "Senha (mínimo 8 caracteres)", tipo: "password", obrigatorio: true },
    { nome: "telefone", rotulo: "Telefone (opcional)", tipo: "tel", obrigatorio: false },
  ];

  return (
    <main className="relative grid min-h-screen place-items-center px-6">
        <FundoViagens />
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-3xl border border-line bg-panel/60 p-10 shadow-2xl shadow-black/30 backdrop-blur-xl"
      >
        <h1 className="font-display text-3xl text-ink">Chama a turma e vem!</h1>

        {campos.map((campo) => (
          <label key={campo.nome} label className="block text-sm font-medium text-ink">
            {campo.rotulo}
            <input
              type={campo.tipo}
              required={campo.obrigatorio}
              value={form[campo.nome]}
              onChange={(e) => atualizar(campo.nome, e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink"
            />
          </label>
        ))}

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
          {carregando ? "Criando conta..." : "Criar conta"}
        </button>

        <p className="text-sm text-muted">
          Já tem conta?{" "}
          <Link to="/entrar" className="font-bold text-ink">
            Entrar
          </Link>
        </p>
      </form>
    </main>
  );
}