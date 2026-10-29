import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const ROTULO_STATUS = {
  PLANEJAMENTO: "Planejando",
  DESTINO_DEFINIDO: "Destino definido",
  ROTEIRO_PRONTO: "Roteiro pronto",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
};

const TOM_PASSO = {
  responder_convite: "bg-accent",
  conversar: "bg-accent",
  ver_roteiro: "bg-turq",
  votar: "bg-turq",
  aguardar_conversas: "bg-gold",
  aguardar_roteiro: "bg-gold",
  recusou: "bg-line",
};

const ACAO_PASSO = {
  responder_convite: { rotulo: "Ver convite", destino: (id) => `/viagens/${id}` },
  conversar: { rotulo: "Conversar", destino: (id) => `/viagens/${id}/chat` },
  ver_roteiro: { rotulo: "Ver roteiro", destino: (id) => `/viagens/${id}` },
  votar: { rotulo: "Ver viagem", destino: (id) => `/viagens/${id}` },
};

function formatarData(data) {
  if (!data) return "Datas a definir";
  return new Date(data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const entrada = (i) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
});

export default function Viagens() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();
  const [viagens, setViagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    api
      .listarViagens()
      .then((v) => {
        if (ativo) setViagens(v);
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
  }, []);

  async function responderConvite(viagemId, acao) {
    try {
      if (acao === "aceitar") await api.confirmarConvite(viagemId);
      else await api.recusarConvite(viagemId);
      setViagens(await api.listarViagens());
    } catch (err) {
      setErro(err.message);
    }
  }

  const convitesPendentes = viagens.filter((v) => v.meuStatusConvite === "PENDENTE");
  const minhasViagens = viagens.filter((v) => v.meuStatusConvite === "ACEITO");
  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "";

  const viagemComAcao = minhasViagens.filter((v) => v.proximoPasso && ACAO_PASSO[v.proximoPasso.tipo]);
  const precisamDeVoce = viagemComAcao.length;

  return (
    <main className="min-h-screen bg-bg px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <motion.header
          {...entrada(0)}
          className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-turq">
              Bem-vinda de volta, {primeiroNome}
            </p>
            <h1 className="mt-2 font-display text-6xl leading-none text-ink">Minhas viagens</h1>
            <p className="mt-3 text-base text-muted">
              {precisamDeVoce > 0
                ? `Você tem ${precisamDeVoce} viagem(ns) esperando por você.`
                : minhasViagens.length > 0
                  ? "Tudo em dia. Quando o grupo precisar de você, avisamos."
                  : "Sua próxima aventura começa com um nome."}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/viagens/nova")}
              className="rounded-full bg-accent px-7 py-3 font-bold text-on-accent shadow-lg shadow-accent/30 transition hover:-translate-y-0.5"
            >
              Nova viagem
            </button>
            <button
              onClick={sair}
              className="rounded-full border border-line px-5 py-3 font-medium text-ink transition hover:bg-line/40"
            >
              Sair
            </button>
          </div>
        </motion.header>

        {erro && (
          <p role="alert" className="mt-6 text-accent">
            {erro}
          </p>
        )}

        {carregando && <p className="mt-12 text-muted">Carregando suas viagens...</p>}

        {!carregando && convitesPendentes.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-3xl text-ink">Convites para você</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {convitesPendentes.map((v, i) => (
                <motion.article
                  key={v.id}
                  {...entrada(i + 1)}
                  className="relative overflow-hidden rounded-3xl border border-accent/40 bg-card p-7"
                >
                  <span className="absolute inset-x-0 top-0 h-1 bg-accent" aria-hidden="true" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Novo convite</p>
                  <h3 className="mt-2 font-display text-3xl text-ink">{v.nome}</h3>
                  <p className="mt-1 text-sm text-muted">{v.totalParticipantes} participante(s)</p>
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => responderConvite(v.id, "aceitar")}
                      className="rounded-full bg-accent px-5 py-2.5 font-bold text-on-accent"
                    >
                      Bora!
                    </button>
                    <button
                      onClick={() => responderConvite(v.id, "recusar")}
                      className="rounded-full border border-line px-5 py-2.5 font-medium text-ink"
                    >
                      Agora não
                    </button>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        )}

        {!carregando && (
          <section className="mt-12">
            <h2 className="font-display text-3xl text-ink">Suas viagens</h2>

            {minhasViagens.length === 0 ? (
              <motion.div
                {...entrada(2)}
                className="mt-5 flex flex-col items-start gap-4 rounded-3xl border border-dashed border-line bg-card p-10"
              >
                <p className="font-display text-3xl text-ink">Ainda não tem viagem por aqui.</p>
                <p className="max-w-md text-muted">
                  Dê um nome para a aventura, chame a turma e deixe a IA cuidar do planejamento.
                </p>
                <button
                  onClick={() => navigate("/viagens/nova")}
                  className="mt-2 rounded-full bg-accent px-6 py-3 font-bold text-on-accent"
                >
                  Criar a primeira viagem
                </button>
              </motion.div>
            ) : (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {minhasViagens.map((v, i) => {
                  const passo = v.proximoPasso;
                  const acao = passo ? ACAO_PASSO[passo.tipo] : null;

                  return (
                    <motion.div key={v.id} {...entrada(i + 2)}>
                      <Link
                        to={`/viagens/${v.id}`}
                        className="group relative block overflow-hidden rounded-3xl border border-line bg-card p-7 transition hover:-translate-y-1 hover:shadow-xl"
                      >
                        <span
                          className={`absolute inset-y-0 left-0 w-1.5 ${TOM_PASSO[passo?.tipo] ?? "bg-line"}`}
                          aria-hidden="true"
                        />
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-display text-3xl text-ink">{v.nome}</h3>
                          {v.meuPapel === "ADMIN" && (
                            <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-on-accent">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-base font-medium text-ink">
                          {v.destino ?? "Destino a definir"}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {formatarData(v.dataInicio)} · {v.totalParticipantes} participante(s)
                        </p>

                        {passo && (
                          <div className="mt-5 rounded-2xl bg-bg p-4">
                            <p className="text-sm font-medium text-ink">{passo.texto}</p>
                            {acao && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate(acao.destino(v.id));
                                }}
                                className="mt-3 rounded-full bg-accent px-5 py-2 text-sm font-bold text-on-accent"
                              >
                                {acao.rotulo}
                              </button>
                            )}
                          </div>
                        )}

                        <div className="mt-5 flex items-center justify-between">
                          <span className="rounded-full border border-line px-3 py-1 text-xs font-bold text-ink">
                            {ROTULO_STATUS[v.status] ?? v.status}
                          </span>
                          <span className="text-sm font-bold text-accent transition group-hover:translate-x-1">
                            Abrir →
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}