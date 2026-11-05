import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatarDataBR } from "../utils/data.js";

const iniciais = (nome = "") =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

function Estatistica({ valor, rotulo }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="font-display text-4xl text-ink">{valor}</p>
      <p className="mt-1 text-sm text-muted">{rotulo}</p>
    </div>
  );
}

export default function Perfil() {
  const { atualizarUsuarioLocal } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [form, setForm] = useState({ nome: "", apelido: "", telefone: "" });
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [senhas, setSenhas] = useState({ senhaAtual: "", novaSenha: "", confirmacao: "" });
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [avisoSenha, setAvisoSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");

  useEffect(() => {
    let ativo = true;
    api
      .buscarPerfil()
      .then((p) => {
        if (!ativo) return;
        setPerfil(p);
        setForm({ nome: p.nome, apelido: p.apelido ?? "", telefone: p.telefone ?? "" });
      })
      .catch((err) => ativo && setErro(err.message));
    return () => {
      ativo = false;
    };
  }, []);

  async function salvarDados(e) {
    e.preventDefault();
    setAviso("");
    setErro("");
    setSalvando(true);
    try {
      const atualizado = await api.atualizarPerfil(form);
      setPerfil((p) => ({ ...p, ...atualizado }));
      atualizarUsuarioLocal?.({ nome: atualizado.nome });
      setAviso("Dados salvos.");
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarSenha(e) {
    e.preventDefault();
    setAvisoSenha("");
    setErroSenha("");

    if (senhas.novaSenha !== senhas.confirmacao) {
      setErroSenha("A confirmação não bate com a nova senha.");
      return;
    }

    setTrocandoSenha(true);
    try {
      await api.trocarSenha({ senhaAtual: senhas.senhaAtual, novaSenha: senhas.novaSenha });
      setSenhas({ senhaAtual: "", novaSenha: "", confirmacao: "" });
      setAvisoSenha("Senha alterada com sucesso.");
    } catch (err) {
      setErroSenha(err.message);
    } finally {
      setTrocandoSenha(false);
    }
  }

  if (!perfil) {
    return <main className="min-h-screen bg-bg px-6 py-12 text-muted">{erro || "Carregando seu perfil..."}</main>;
  }

  const campo = "mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted";

  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-wrap items-center gap-6"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full bg-turq/20 font-display text-3xl text-ink">
            {iniciais(perfil.nome)}
          </span>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-turq">Seu perfil</p>
            <h1 className="mt-1 font-display text-5xl leading-tight text-ink">
              {perfil.apelido || perfil.nome}
            </h1>
            <p className="mt-1 text-muted">
              {perfil.email}
              {perfil.criadoEm && ` · na ViajaIA desde ${formatarDataBR(perfil.criadoEm)}`}
            </p>
          </div>
        </motion.header>

        <section className="mt-10 grid grid-cols-3 gap-4">
          <Estatistica valor={perfil.estatisticas.viagensParticipando} rotulo="viagens" />
          <Estatistica valor={perfil.estatisticas.viagensAdministradas} rotulo="que você organiza" />
          <Estatistica valor={perfil.estatisticas.viagensConcluidas} rotulo="já concluídas" />
        </section>

        <section className="mt-10 rounded-3xl border border-line bg-card p-7">
          <h2 className="font-display text-2xl text-ink">Seus dados</h2>
          <form onSubmit={salvarDados} className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-medium text-ink">
              Nome
              <input className={campo} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </label>
            <label className="block text-sm font-medium text-ink">
              Apelido <span className="font-normal text-muted">(como a turma te chama)</span>
              <input
                className={campo}
                placeholder="Ex.: Manu"
                value={form.apelido}
                onChange={(e) => setForm({ ...form, apelido: e.target.value })}
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Telefone
              <input
                type="tel"
                className={campo}
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={salvando}
                className="w-full rounded-full bg-accent px-6 py-3 font-bold text-on-accent disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
          {aviso && <p className="mt-4 font-medium text-turq">{aviso}</p>}
          {erro && <p role="alert" className="mt-4 font-medium text-accent">{erro}</p>}
        </section>

        <section className="mt-6 rounded-3xl border border-line bg-card p-7">
          <h2 className="font-display text-2xl text-ink">Trocar senha</h2>
          <form onSubmit={salvarSenha} className="mt-5 grid gap-5 md:grid-cols-3">
            <label className="block text-sm font-medium text-ink">
              Senha atual
              <input
                type="password"
                required
                className={campo}
                value={senhas.senhaAtual}
                onChange={(e) => setSenhas({ ...senhas, senhaAtual: e.target.value })}
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Nova senha
              <input
                type="password"
                required
                minLength={8}
                className={campo}
                value={senhas.novaSenha}
                onChange={(e) => setSenhas({ ...senhas, novaSenha: e.target.value })}
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Confirmar nova senha
              <input
                type="password"
                required
                minLength={8}
                className={campo}
                value={senhas.confirmacao}
                onChange={(e) => setSenhas({ ...senhas, confirmacao: e.target.value })}
              />
            </label>
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={trocandoSenha}
                className="rounded-full border border-turq px-6 py-3 font-bold text-turq disabled:opacity-60"
              >
                {trocandoSenha ? "Trocando..." : "Trocar senha"}
              </button>
            </div>
          </form>
          {avisoSenha && <p className="mt-4 font-medium text-turq">{avisoSenha}</p>}
          {erroSenha && <p role="alert" className="mt-4 font-medium text-accent">{erroSenha}</p>}
        </section>
      </div>
    </main>
  );
}