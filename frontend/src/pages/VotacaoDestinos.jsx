import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function VotacaoDestinos() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [souAdmin, setSouAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let ativo = true;

    Promise.all([api.listarDestinos(id), api.buscarViagem(id)])
      .then(([destinos, viagem]) => {
        if (!ativo) return;
        setDados(destinos);
        const eu = viagem.participantes.find((p) => p.usuarioId === usuario?.id);
        setSouAdmin(eu?.papel === "ADMIN");
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
  }, [id, usuario?.id]);

  async function executar(acao, mensagemSucesso) {
    setOcupado(true);
    setErro("");
    setAviso("");
    try {
      await acao();
      setDados(await api.listarDestinos(id));
      if (mensagemSucesso) setAviso(mensagemSucesso);
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const destinos = dados?.destinos ?? [];
  const encerrada = Boolean(dados?.votacaoEncerrada);
  const jaVotei = Boolean(dados?.meuVotoDestinoId);
  const destinoFinal = destinos.find((d) => d.id === dados?.destinoFinalId);
  const percentual = dados?.totalParticipantes
    ? Math.round((dados.totalVotos / dados.totalParticipantes) * 100)
    : 0;

  const maximo = Math.max(0, ...destinos.map((d) => d.votos));
  const empatados = destinos.filter((d) => d.votos === maximo && maximo > 0);
  const temEmpate = empatados.length > 1;

  if (carregando) {
    return <main className="min-h-screen bg-bg px-6 py-12 text-muted">Carregando os destinos...</main>;
  }

  return (
    <main className="min-h-screen bg-bg px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <Link to={`/viagens/${id}`} className="text-sm font-bold text-accent">
          ← Voltar para a viagem
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-6 border-b border-line pb-8"
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-turq">Votação</p>
          <h1 className="mt-2 font-display text-6xl leading-none text-ink">Qual será o destino?</h1>
          {dados && (
            <div className="mt-6 max-w-md">
              <p className="text-sm text-muted">
                {dados.totalVotos} de {dados.totalParticipantes} voto(s)
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                <motion.div
                  className="h-full bg-turq"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentual}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </motion.header>

        {erro && <p role="alert" className="mt-6 font-medium text-accent">{erro}</p>}
        {aviso && <p className="mt-6 font-medium text-turq">{aviso}</p>}

        {encerrada && (
          <section className="mt-10 rounded-3xl border border-turq/40 bg-card p-8">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-turq">Destino escolhido</p>
            <h2 className="mt-2 font-display text-5xl text-ink">
              {destinoFinal?.nomeDestino ?? "Definido"}
            </h2>
            {destinoFinal?.descricao && <p className="mt-3 text-muted">{destinoFinal.descricao}</p>}
            <Link to={`/viagens/${id}`} className="mt-6 inline-block font-bold text-accent">
              Voltar para a viagem →
            </Link>
          </section>
        )}

        {!encerrada && destinos.length === 0 && (
          <section className="mt-10 rounded-3xl border border-dashed border-line bg-card p-10">
            {souAdmin ? (
              <>
                <p className="font-display text-3xl text-ink">Hora de sugerir destinos</p>
                <p className="mt-2 max-w-md text-muted">
                  A IA vai olhar o perfil de todo o grupo e sugerir três lugares. Isso só funciona quando todos
                  já conversaram com o agente.
                </p>
                <button
                  onClick={() =>
                    executar(() => api.sugerirDestinos(id), "Sugestões geradas! Agora é só votar.")
                  }
                  disabled={ocupado}
                  className="mt-6 rounded-full bg-accent px-6 py-3 font-bold text-on-accent disabled:opacity-60"
                >
                  {ocupado ? "Pensando nos destinos..." : "Gerar sugestões com a IA"}
                </button>
              </>
            ) : (
              <p className="font-display text-3xl text-ink">
                O admin ainda vai gerar as sugestões de destino.
              </p>
            )}
          </section>
        )}

        {!encerrada && destinos.length > 0 && (
          <section className="mt-10">
            {jaVotei && (
              <p className="mb-6 text-muted">Seu voto já está registrado. Agora é esperar o restante do grupo.</p>
            )}

            <div className="grid gap-5 md:grid-cols-3">
              {destinos.map((d, i) => {
                const meuVoto = dados.meuVotoDestinoId === d.id;
                return (
                  <motion.article
                    key={d.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
                    className={`flex flex-col rounded-3xl border bg-card p-7 ${
                      meuVoto ? "border-turq" : "border-line"
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
                      {d.geradoPorIa ? "Sugerido pela IA" : "Informado por você"}
                    </span>
                    <h3 className="mt-3 font-display text-3xl leading-tight text-ink">{d.nomeDestino}</h3>
                    {d.descricao && <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{d.descricao}</p>}

                    <p className="mt-6 text-sm font-bold text-ink">
                      {d.votos} voto(s)
                    </p>

                    <button
                      onClick={() => executar(() => api.votar(id, d.id), "Voto registrado!")}
                      disabled={jaVotei || ocupado}
                      className={`mt-4 rounded-full px-5 py-3 font-bold disabled:opacity-60 ${
                        meuVoto ? "bg-turq text-on-accent" : "bg-accent text-on-accent"
                      }`}
                    >
                      {meuVoto ? "Seu voto" : "Votar neste"}
                    </button>
                  </motion.article>
                );
              })}
            </div>
          </section>
        )}

        {souAdmin && !encerrada && destinos.length > 0 && (
          <section className="mt-12 rounded-3xl border border-line bg-card p-7">
            <h2 className="font-display text-3xl text-ink">Encerrar a votação</h2>

            {dados.totalVotos === 0 && (
              <p className="mt-2 text-muted">Assim que alguém votar, você pode encerrar a votação.</p>
            )}

            {dados.totalVotos > 0 && !temEmpate && (
              <>
                <p className="mt-2 text-muted">
                  Se o grupo já decidiu, você pode fechar a votação agora, sem esperar o restante.
                </p>
                <button
                  onClick={() => executar(() => api.encerrarVotacao(id), "Destino definido!")}
                  disabled={ocupado}
                  className="mt-5 rounded-full border border-turq px-6 py-3 font-bold text-turq disabled:opacity-60"
                >
                  Encerrar com o mais votado
                </button>
              </>
            )}

            {dados.totalVotos > 0 && temEmpate && (
              <>
                <p className="mt-2 text-muted">
                  Deu empate. Escolha qual dos destinos empatados vai ser o do grupo.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {empatados.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => executar(() => api.encerrarVotacao(id, d.id), "Destino definido!")}
                      disabled={ocupado}
                      className="rounded-full border border-turq px-5 py-2.5 font-bold text-turq disabled:opacity-60"
                    >
                      {d.nomeDestino}
                    </button>
                  ))}
                </div>
              </>
            )}

            {dados.totalVotos === 0 && (
              <button
                onClick={() =>
                  executar(() => api.sugerirDestinos(id), "Novas sugestões geradas!")
                }
                disabled={ocupado}
                className="mt-5 text-sm font-bold text-accent disabled:opacity-60"
              >
                Gerar novas sugestões
              </button>
            )}
          </section>
        )}
      </div>
    </main>
  );
}