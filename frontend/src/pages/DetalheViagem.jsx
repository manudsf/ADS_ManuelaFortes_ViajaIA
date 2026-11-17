import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import ConfirmacaoModal from "../components/ConfirmacaoModal.jsx";
import { formatarDataBR } from "../utils/data.js";

const ROTULO_STATUS = {
  PLANEJAMENTO: "Planejando",
  DESTINO_DEFINIDO: "Destino definido",
  ROTEIRO_PRONTO: "Roteiro pronto",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};

const TIPOS_VIAGEM = [
  { chave: "AMIGOS", rotulo: "Entre amigos" },
  { chave: "CASAL", rotulo: "De casal" },
  { chave: "ROMANTICA", rotulo: "Romântica" },
  { chave: "ANIVERSARIO", rotulo: "Aniversário" },
  { chave: "DATA_ESPECIAL", rotulo: "Data especial" },
  { chave: "FAMILIA", rotulo: "Em família" },
];

const ICONES = {
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  mapa: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z",
  roteiro: "M9 20l-6-3V4l6 3 6-3 6 3v13l-6-3-6 3z",
  carteira: "M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM16 14h.01M2 9V6a2 2 0 0 1 2-2h13",
  seta: "M5 12h14M13 6l6 6-6 6",
  remover: "M6 6l12 12M18 6L6 18",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  copiar: "M9 9h10v10H9zM5 15V5h10",
  desativar: "M18.36 5.64A9 9 0 1 1 5.64 18.36M12 3v9M4.93 4.93l14.14 14.14",
};

function Icone({ caminho, className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={caminho} />
    </svg>
  );
}

const iniciais = (nome) =>
  nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

function textoSituacao(p) {
  if (p.statusConvite === "PENDENTE") return "Convite pendente";
  if (p.statusConvite === "RECUSADO") return "Recusou o convite";
  return p.conversaConcluidaEm ? "Conversa concluída" : "Falta conversar com o agente";
}

const TONS_PASSO = {
  turq: {
    superficie: "border-turq/50 bg-turq/10",
    destaque: "text-turq",
    seta: "bg-turq",
  },
  accent: {
    superficie: "border-accent/50 bg-accent/10",
    destaque: "text-accent",
    seta: "bg-accent",
  },
  gold: {
    superficie: "border-gold/50 bg-gold/10",
    destaque: "text-gold",
    seta: "bg-gold",
  },
};

function proximoPasso(viagem, euNaViagem, souAdmin) {
  if (!euNaViagem || (euNaViagem.statusConvite !== "ACEITO" && !souAdmin)) return null;

  if (!euNaViagem.conversaConcluidaEm) {
    return {
      para: `/viagens/${viagem.id}/chat`,
      titulo: "Conte suas preferências",
      texto: "Um papo rápido com o agente. A IA organiza o resto.",
      tom: "turq",
    };
  }

  if (!viagem.destinoFinalId) {
    return {
      para: `/viagens/${viagem.id}/destinos`,
      titulo: "Hora de escolher o destino",
      texto: "A IA sugere lugares para o grupo. Um voto por pessoa.",
      tom: "accent",
    };
  }

  return {
    para: `/viagens/${viagem.id}/roteiro`,
    titulo: "Destino escolhido",
    texto: "Monte o roteiro dia a dia, com hospedagem, restaurantes e valores.",
    tom: "gold",
  };
}

function confirmadoOuAdminSeguro(participante) {
  return participante?.statusConvite === "ACEITO" || participante?.papel === "ADMIN";
}

export default function DetalheViagem() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [viagem, setViagem] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [emailConvite, setEmailConvite] = useState("");
  const [enviandoConvite, setEnviandoConvite] = useState(false);
  const [abaConvite, setAbaConvite] = useState("email");
  const [confirmacao, setConfirmacao] = useState(null);
  const [linkConvite, setLinkConvite] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [tipoEscolhido, setTipoEscolhido] = useState("");
  const [detalheTipo, setDetalheTipo] = useState("");

  async function carregar() {
    try {
      setViagem(await api.buscarViagem(id));
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let ativo = true;

    api
      .buscarViagem(id)
      .then((v) => {
        if (ativo) setViagem(v);
      })
      .catch((err) => {
        if (ativo) setErro(err.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [id]);

  const euNaViagem = viagem?.participantes.find((p) => p.usuarioId === usuario?.id);
  const souAdmin = euNaViagem?.papel === "ADMIN";
  const convitePendente = euNaViagem?.statusConvite === "PENDENTE";
  const passo = viagem ? proximoPasso(viagem, euNaViagem, souAdmin) : null;

  async function responderConvite(acao) {
    setErro("");
    try {
      if (acao === "aceitar") {
        await api.confirmarConvite(id);
        carregar();
      } else {
        await api.recusarConvite(id);
        navigate("/viagens");
      }
    } catch (err) {
      setErro(err.message);
    }
  }

  async function convidar(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    setEnviandoConvite(true);
    try {
      await api.convidar(id, emailConvite);
      setEmailConvite("");
      setMensagem("Convite enviado! A pessoa vai receber um e-mail.");
      carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviandoConvite(false);
    }
  }

  async function executarConfirmacao() {
    const acao = confirmacao;
    setConfirmacao(null);
    setErro("");

    try {
      if (acao.tipo === "remover") {
        await api.removerParticipante(id, acao.participanteId);
        carregar();
      } else {
        await api.excluirViagem(id);
        navigate("/viagens");
      }
    } catch (err) {
      setErro(err.message);
    }
  }

  async function gerarLink() {
    setErro("");
    try {
      setLinkConvite(await api.gerarLinkConvite(id));
      setCopiado(false);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function copiarLink() {
    await navigator.clipboard.writeText(linkConvite.url);
    setCopiado(true);
  }

  async function desativarLink() {
    setErro("");
    try {
      await api.revogarLinkConvite(id);
      setLinkConvite(null);
    } catch (err) {
      setErro(err.message);
    }
  }

  async function salvarTipo() {
    if (!tipoEscolhido) return;
    setErro("");
    try {
      await api.definirTipoViagem(id, tipoEscolhido, detalheTipo);
      setTipoEscolhido("");
      setDetalheTipo("");
      carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  const textoConfirmacao =
    confirmacao?.tipo === "remover"
      ? {
          titulo: "Remover participante?",
          texto: `${confirmacao.nome} vai sair do grupo e perder o acesso à viagem.`,
          textoConfirmar: "Sim, remover",
        }
      : {
          titulo: "Excluir a viagem?",
          texto: "Todo o grupo perde a viagem, as conversas e os roteiros. Essa ação não pode ser desfeita.",
          textoConfirmar: "Sim, excluir",
        };

  if (carregando) {
    return <main className="min-h-screen bg-bg px-6 py-12 text-muted">Carregando a viagem...</main>;
  }

  if (!viagem) {
    return (
      <main className="min-h-screen bg-bg px-6 py-12">
        <p role="alert" className="text-accent">{erro || "Viagem não encontrada."}</p>
        <Link to="/viagens" className="mt-6 inline-block text-sm font-bold text-accent">
          ← Voltar para minhas viagens
        </Link>
      </main>
    );
  }

  const acoesRapidas = [
    { para: `/viagens/${id}/chat`, rotulo: "Agente", icone: ICONES.chat, tom: "bg-turq" },
    { para: `/viagens/${id}/destinos`, rotulo: "Votação", icone: ICONES.mapa, tom: "bg-accent" },
    { para: `/viagens/${id}/roteiro`, rotulo: "Roteiro", icone: ICONES.roteiro, tom: "bg-gold" },
    { para: `/viagens/${id}/despesas`, rotulo: "Despesas", icone: ICONES.carteira, tom: "bg-accent" },
  ];

  const podeVerAcoes = confirmadoOuAdminSeguro(euNaViagem);
  const precisaDetalheTipo = tipoEscolhido === "ANIVERSARIO" || tipoEscolhido === "DATA_ESPECIAL";

  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link to="/viagens" className="text-sm font-bold text-muted transition hover:text-accent">
          ← Minhas viagens
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-turq/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-turq">
              {ROTULO_STATUS[viagem.status] ?? viagem.status}
            </span>
            {souAdmin && (
              <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold">Você é o admin</span>
            )}
          </div>
          <h1 className="mt-4 font-display text-5xl leading-tight text-ink">{viagem.nome}</h1>
          <p className="mt-2 text-muted">
            {viagem.destinoFinal?.nomeDestino ?? "Destino a definir"} ·{" "}
            {formatarDataBR(viagem.dataInicio) || "Datas a definir"}
            {viagem.dataFim && ` até ${formatarDataBR(viagem.dataFim)}`}
          </p>
        </motion.header>

        {erro && <p role="alert" className="mt-6 font-medium text-accent">{erro}</p>}
        {mensagem && <p className="mt-6 font-medium text-turq">{mensagem}</p>}

        {convitePendente && (
          <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-accent/40 bg-card p-6">
            <div>
              <p className="font-display text-2xl text-ink">Você foi convidado</p>
              <p className="text-sm text-muted">Aceite para entrar no planejamento.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => responderConvite("aceitar")}
                className="rounded-full bg-accent px-5 py-2.5 font-bold text-on-accent"
              >
                Bora!
              </button>
              <button
                onClick={() => responderConvite("recusar")}
                className="rounded-full border border-line px-5 py-2.5 font-medium text-ink"
              >
                Agora não
              </button>
            </div>
          </section>
        )}

        {souAdmin && !viagem.tipoViagem && (
          <section className="mt-6 rounded-3xl border border-line bg-card p-6">
            <p className="font-display text-2xl text-ink">Que tipo de viagem é essa?</p>
            <p className="mt-1 text-sm text-muted">
              Isso ajuda a IA a sugerir passeios e experiências que combinam com o momento.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {TIPOS_VIAGEM.map((t) => (
                <button
                  key={t.chave}
                  onClick={() => setTipoEscolhido(t.chave)}
                  className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                    tipoEscolhido === t.chave ? "border-turq bg-turq text-on-accent" : "border-line text-ink"
                  }`}
                >
                  {t.rotulo}
                </button>
              ))}
            </div>

            {precisaDetalheTipo && (
              <input
                value={detalheTipo}
                onChange={(e) => setDetalheTipo(e.target.value)}
                placeholder={
                  tipoEscolhido === "ANIVERSARIO" ? "De quem é o aniversário?" : "Qual é a data especial?"
                }
                className="mt-4 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted"
              />
            )}

            <button
              onClick={salvarTipo}
              disabled={!tipoEscolhido}
              className="mt-4 rounded-full bg-accent px-6 py-2.5 font-bold text-on-accent disabled:opacity-50"
            >
              Salvar tipo de viagem
            </button>
          </section>
        )}

        {passo && (
          <Link
            to={passo.para}
            className={`mt-8 flex items-center justify-between gap-6 rounded-3xl border p-7 text-ink transition hover:-translate-y-0.5 hover:shadow-xl ${TONS_PASSO[passo.tom].superficie}`}
          >
            <div>
              <p className={`text-xs font-bold uppercase tracking-[0.16em] ${TONS_PASSO[passo.tom].destaque}`}>
                Próximo passo
              </p>
              <p className="mt-1 font-display text-3xl leading-tight">{passo.titulo}</p>
              <p className="mt-1 text-sm text-muted">{passo.texto}</p>
            </div>
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-on-accent ${TONS_PASSO[passo.tom].seta}`}
            >
              <Icone caminho={ICONES.seta} />
            </span>
          </Link>
        )}

        {podeVerAcoes && (
          <nav className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {acoesRapidas.map((acao) => (
              <Link
                key={acao.rotulo}
                to={acao.para}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-4 transition hover:border-turq"
              >
                <span className={`grid h-9 w-9 place-items-center rounded-xl text-on-accent ${acao.tom}`}>
                  <Icone caminho={acao.icone} className="h-4 w-4" />
                </span>
                <span className="text-sm font-bold text-ink">{acao.rotulo}</span>
              </Link>
            ))}
          </nav>
        )}

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl text-ink">Turma</h2>
            <span className="text-sm text-muted">{viagem.participantes.length} pessoa(s)</span>
          </div>

          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
            {viagem.participantes.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-turq/20 text-sm font-bold text-ink">
                  {iniciais(p.usuario.nome)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {p.usuario.nome}
                    {p.usuarioId === usuario?.id && <span className="text-muted"> (você)</span>}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {p.papel === "ADMIN" ? "Admin" : "Membro"} · {textoSituacao(p)}
                  </p>
                </div>
                {souAdmin && p.papel !== "ADMIN" && (
                  <button
                    onClick={() => setConfirmacao({ tipo: "remover", participanteId: p.id, nome: p.usuario.nome })}
                    aria-label={`Remover ${p.usuario.nome}`}
                    title="Remover"
                    className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-accent/15 hover:text-accent"
                  >
                    <Icone caminho={ICONES.remover} className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {souAdmin && (
          <section className="mt-10 rounded-3xl border border-line bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink">Chamar a turma</h2>
                <p className="text-sm text-muted">Por e-mail de quem já tem conta, ou por um link de 7 dias.</p>
              </div>
              <div className="flex rounded-full border border-line p-1 text-sm font-bold">
                {[
                  { chave: "email", rotulo: "E-mail" },
                  { chave: "link", rotulo: "Link" },
                ].map((aba) => (
                  <button
                    key={aba.chave}
                    onClick={() => setAbaConvite(aba.chave)}
                    className={`rounded-full px-4 py-2 transition ${
                      abaConvite === aba.chave ? "bg-accent text-on-accent" : "text-muted hover:text-ink"
                    }`}
                  >
                    {aba.rotulo}
                  </button>
                ))}
              </div>
            </div>

            {abaConvite === "email" ? (
              <form onSubmit={convidar} className="mt-5 flex flex-wrap gap-3">
                <input
                  type="email"
                  required
                  placeholder="E-mail de quem já tem conta"
                  value={emailConvite}
                  onChange={(e) => setEmailConvite(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted"
                />
                <button
                  type="submit"
                  disabled={enviandoConvite}
                  className="rounded-full bg-accent px-6 py-3 font-bold text-on-accent disabled:opacity-60"
                >
                  {enviandoConvite ? "Enviando..." : "Enviar"}
                </button>
              </form>
            ) : !linkConvite ? (
              <button
                onClick={gerarLink}
                className="mt-5 flex items-center gap-2 rounded-full border border-turq px-5 py-3 font-bold text-turq"
              >
                <Icone caminho={ICONES.link} className="h-4 w-4" />
                Gerar link de convite
              </button>
            ) : (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={linkConvite.url}
                  className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 text-sm text-ink"
                />
                <button
                  onClick={copiarLink}
                  className="flex items-center gap-2 rounded-full bg-turq px-5 py-3 font-bold text-on-accent"
                >
                  <Icone caminho={ICONES.copiar} className="h-4 w-4" />
                  {copiado ? "Copiado!" : "Copiar"}
                </button>
                <button
                  onClick={desativarLink}
                  className="flex items-center gap-2 rounded-full border border-line px-4 py-3 font-medium text-ink"
                >
                  <Icone caminho={ICONES.desativar} className="h-4 w-4" />
                  Desativar
                </button>
              </div>
            )}
          </section>
        )}

        {souAdmin && (
          <footer className="mt-16 border-t border-line pt-6 text-center">
            <button
              onClick={() => setConfirmacao({ tipo: "excluir" })}
              className="text-sm font-medium text-muted transition hover:text-accent"
            >
              Excluir esta viagem
            </button>
          </footer>
        )}
      </div>

      <ConfirmacaoModal
        aberto={Boolean(confirmacao)}
        titulo={textoConfirmacao.titulo}
        texto={textoConfirmacao.texto}
        textoConfirmar={textoConfirmacao.textoConfirmar}
        textoCancelar="Cancelar"
        perigoso
        onConfirmar={executarConfirmacao}
        onCancelar={() => setConfirmacao(null)}
      />
    </main>
  );
}