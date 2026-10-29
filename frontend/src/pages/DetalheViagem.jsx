import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import ConfirmacaoModal from "../components/ConfirmacaoModal.jsx";

const ROTULO_STATUS = {
  PLANEJAMENTO: "Planejando",
  DESTINO_DEFINIDO: "Destino definido",
  ROTEIRO_PRONTO: "Roteiro pronto",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};

const acoesEmBreve = [{ rotulo: "Votar no destino" }, { rotulo: "Ver o roteiro" }];

function formatarData(data) {
  if (!data) return "Datas a definir";
  return new Date(data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function confirmadoOuAdmin(participante) {
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
  const [confirmacao, setConfirmacao] = useState(null);
  const [linkConvite, setLinkConvite] = useState(null);
  const [copiado, setCopiado] = useState(false);

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

  return (
    <main className="min-h-screen bg-bg px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <Link to="/viagens" className="text-sm font-bold text-accent">
          ← Voltar para minhas viagens
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-6 border-b border-line pb-8"
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-turq">
            {ROTULO_STATUS[viagem.status] ?? viagem.status}
          </p>
          <h1 className="mt-2 font-display text-6xl leading-none text-ink">{viagem.nome}</h1>
          <p className="mt-4 text-base text-muted">
            {viagem.destinoFinal?.nomeDestino ?? "Destino a definir"} · {formatarData(viagem.dataInicio)}
            {viagem.dataFim && ` até ${formatarData(viagem.dataFim)}`}
          </p>
        </motion.header>

        {erro && <p role="alert" className="mt-6 font-medium text-accent">{erro}</p>}
        {mensagem && <p className="mt-6 font-medium text-turq">{mensagem}</p>}

        {convitePendente && (
          <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-accent/40 bg-card p-7">
            <div>
              <p className="font-display text-3xl text-ink">Você foi convidado para esta viagem</p>
              <p className="mt-1 text-muted">Aceite para participar do planejamento.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => responderConvite("aceitar")} className="rounded-full bg-accent px-6 py-3 font-bold text-on-accent">
                Bora!
              </button>
              <button onClick={() => responderConvite("recusar")} className="rounded-full border border-line px-6 py-3 font-medium text-ink">
                Agora não
              </button>
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-3xl text-ink">Participantes</h2>
          <ul className="mt-5 grid gap-3">
            {viagem.participantes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-card px-5 py-4">
                <div>
                  <p className="font-medium text-ink">
                    {p.usuario.nome}
                    {p.papel === "ADMIN" && (
                      <span className="ml-3 rounded-full bg-gold px-3 py-0.5 text-xs font-bold text-on-accent">Admin</span>
                    )}
                  </p>
                  <p className="text-sm text-muted">{p.usuario.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-ink">
                    {p.statusConvite === "ACEITO" ? "Confirmado" : p.statusConvite === "PENDENTE" ? "Pendente" : "Recusou"}
                  </span>
                  {souAdmin && p.papel !== "ADMIN" && (
                    <button
                      onClick={() => setConfirmacao({ tipo: "remover", participanteId: p.id, nome: p.usuario.nome })}
                      className="text-sm font-bold text-accent"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {souAdmin && (
          <>
            <section className="mt-10 rounded-3xl border border-line bg-card p-7">
              <h2 className="font-display text-3xl text-ink">Chamar mais alguém</h2>
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
                  {enviandoConvite ? "Enviando..." : "Enviar convite"}
                </button>
              </form>
            </section>

            <section className="mt-6 rounded-3xl border border-line bg-card p-7">
              <h2 className="font-display text-3xl text-ink">Convidar por link</h2>
              <p className="mt-2 text-muted">
                Mande o link no WhatsApp. Quem abrir entra no grupo, e o link vale por 7 dias.
              </p>

              {!linkConvite ? (
                <button
                  onClick={gerarLink}
                  className="mt-5 rounded-full border border-turq px-6 py-3 font-bold text-turq"
                >
                  Gerar link
                </button>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  <input
                    readOnly
                    value={linkConvite.url}
                    className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-3 text-ink"
                  />
                  <button onClick={copiarLink} className="rounded-full bg-turq px-6 py-3 font-bold text-on-accent">
                    {copiado ? "Copiado!" : "Copiar"}
                  </button>
                  <button onClick={desativarLink} className="rounded-full border border-line px-5 py-3 font-medium text-ink">
                    Desativar
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {confirmadoOuAdmin(euNaViagem) && (
          <section className="mt-10">
            <h2 className="font-display text-3xl text-ink">Próximos passos</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Link
                to={`/viagens/${id}/chat`}
                className="rounded-3xl border border-line bg-card p-6 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <p className="font-medium text-ink">Conversar com o agente</p>
                <p className="mt-2 text-sm text-muted">Conte suas preferências para a IA.</p>
              </Link>
              {acoesEmBreve.map((acao) => (
                <div key={acao.rotulo} className="rounded-3xl border border-dashed border-line bg-card p-6 text-muted">
                  <p className="font-medium text-ink">{acao.rotulo}</p>
                  <p className="mt-2 text-sm">Em breve</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {souAdmin && (
          <section className="mt-14 border-t border-line pt-8">
            <button onClick={() => setConfirmacao({ tipo: "excluir" })} className="text-sm font-bold text-accent">
              Excluir esta viagem
            </button>
          </section>
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