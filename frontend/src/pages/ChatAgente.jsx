import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function IndicadorDigitando() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-panel px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-muted"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

export default function ChatAgente() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [viagem, setViagem] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [confirmandoConclusao, setConfirmandoConclusao] = useState(false);
  const [erro, setErro] = useState("");
  const fimRef = useRef(null);

  const minhaParticipacao = viagem?.participantes.find((p) => p.usuarioId === usuario?.id);
  const encerrada = Boolean(minhaParticipacao?.conversaConcluidaEm);
  const temMensagemMinha = mensagens.some((m) => m.remetente === "USUARIO");

  useEffect(() => {
    Promise.all([api.buscarViagem(id), api.listarMensagens(id)])
      .then(([v, m]) => {
        setViagem(v);
        setMensagens(m);
      })
      .catch((err) => setErro(err.message));
  }, [id]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, enviando]);

  async function atualizarMensagens() {
    setMensagens(await api.listarMensagens(id));
  }

  async function enviar(e) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviando || encerrada) return;

    setErro("");
    setTexto("");
    setEnviando(true);

    const temporaria = { id: `tmp-${Date.now()}`, remetente: "USUARIO", conteudo };
    setMensagens((atual) => [...atual, temporaria]);

    try {
      await api.enviarMensagem(id, conteudo);
      await atualizarMensagens();
    } catch (err) {
      setMensagens((atual) => atual.filter((m) => m.id !== temporaria.id));
      setTexto(conteudo);
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function concluir() {
    setConfirmandoConclusao(false);
    setConcluindo(true);
    setErro("");
    try {
      await api.concluirConversa(id);
      const [v] = await Promise.all([api.buscarViagem(id), atualizarMensagens()]);
      setViagem(v);
    } catch (err) {
      setErro(err.message);
    } finally {
      setConcluindo(false);
    }
  }

  if (!viagem && !erro) {
    return <main className="min-h-screen bg-bg px-6 py-12 text-muted">Abrindo a conversa...</main>;
  }

  return (
    <main className="min-h-screen bg-bg px-6 py-12">
      <div className="mx-auto flex max-w-3xl flex-col">
        <Link to={`/viagens/${id}`} className="text-sm font-bold text-accent">
          ← Voltar para a viagem
        </Link>

        <header className="mt-6 border-b border-line pb-6">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-turq">Agente de IA</p>
          <h1 className="mt-2 font-display text-5xl leading-none text-ink">Conte o que você curte</h1>
          <p className="mt-3 text-muted">
            Orçamento, interesses e o que não pode faltar. A conversa é só sua, ninguém do grupo vê.
          </p>
        </header>

        {erro && (
          <p role="alert" className="mt-6 font-medium text-accent">
            {erro}
          </p>
        )}

        {encerrada && (
          <div className="mt-6 rounded-3xl border border-turq/40 bg-card p-6">
            <p className="font-display text-3xl text-ink">Conversa concluída</p>
            <p className="mt-1 text-muted">
               Suas preferências foram salvas e já entram na conta do grupo.
            </p>
          </div>
        )}

        <div className="mt-6 flex h-[55vh] flex-col gap-4 overflow-y-auto rounded-3xl border border-line bg-card p-6">
          {mensagens.length === 0 && (
            <p className="m-auto text-center text-muted">
              Mande um oi para começar. A IA pergunta o resto.
            </p>
          )}

          {mensagens.map((m) => {
            const minha = m.remetente === "USUARIO";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${minha ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 leading-relaxed ${
                    minha ? "rounded-br-sm bg-accent text-on-accent" : "rounded-bl-sm bg-panel text-ink"
                  }`}
                >
                  {m.conteudo}
                </div>
              </motion.div>
            );
          })}

          {enviando && (
            <div className="flex justify-start">
              <IndicadorDigitando />
            </div>
          )}

          <div ref={fimRef} />
        </div>

        <form onSubmit={enviar} className="mt-4 flex gap-3">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={encerrada || enviando}
            placeholder={encerrada ? "Conversa concluída" : "Escreva sua resposta..."}
            className="min-w-0 flex-1 rounded-full border border-line bg-card px-5 py-3 text-ink placeholder:text-muted disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={encerrada || enviando || !texto.trim()}
            className="rounded-full bg-accent px-6 py-3 font-bold text-on-accent disabled:opacity-50"
          >
            Enviar
          </button>
        </form>

        {!encerrada && temMensagemMinha && !confirmandoConclusao && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">Já falou tudo o que queria? Conclua para o grupo seguir.</p>
            <button
              onClick={() => setConfirmandoConclusao(true)}
              disabled={concluindo || enviando}
              className="rounded-full border border-turq px-5 py-2.5 font-bold text-turq disabled:opacity-60"
            >
              {concluindo ? "Concluindo..." : "Concluir conversa"}
            </button>
          </div>
        )}

        {confirmandoConclusao && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 rounded-3xl border border-turq/40 bg-card p-6"
          >
            <p className="font-display text-3xl text-ink">Tudo certo por aqui?</p>
            <p className="mt-2 text-muted">
              Vou guardar o que você contou e fechar a conversa. Depois disso, não dá para mandar mais mensagens ao agente.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={concluir}
                className="rounded-full bg-turq px-6 py-3 font-bold text-on-accent"
              >
                Sim, pode concluir
              </button>
              <button
                onClick={() => setConfirmandoConclusao(false)}
                className="rounded-full border border-line px-6 py-3 font-medium text-ink"
              >
                Ainda tenho coisas para contar
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}