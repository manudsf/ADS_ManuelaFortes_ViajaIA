import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function ConvitePublico() {
  const { token } = useParams();
  const { autenticado } = useAuth();
  const navigate = useNavigate();
  const [convite, setConvite] = useState(null);
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    let ativo = true;

    api
      .buscarConvite(token)
      .then((c) => {
        if (ativo) setConvite(c);
      })
      .catch((err) => {
        if (ativo) setErro(err.message);
      });

    return () => {
      ativo = false;
    };
  }, [token]);

  async function entrar() {
    setEntrando(true);
    setErro("");
    try {
      const { viagemId } = await api.aceitarConvite(token);
      navigate(`/viagens/${viagemId}`);
    } catch (err) {
      setErro(err.message);
      setEntrando(false);
    }
  }

  const caminhoAposLogin = encodeURIComponent(`/convite/${token}`);

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg rounded-3xl border border-line bg-card p-10 text-center"
      >
        {!convite && !erro && <p className="text-muted">Abrindo o convite...</p>}

        {!convite && erro && (
          <>
            <p className="font-display text-4xl text-ink">Esse convite não está mais disponível</p>
            <p className="mt-3 text-muted">{erro}</p>
            <Link to="/viagens" className="mt-6 inline-block text-sm font-bold text-accent">
              Ir para minhas viagens
            </Link>
          </>
        )}

        {convite && (
          <>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-turq">Você foi chamado</p>
            <h1 className="mt-3 font-display text-5xl leading-tight text-ink">{convite.nomeViagem}</h1>
            <p className="mt-4 text-muted">
              {convite.nomeAdmin ? `${convite.nomeAdmin} montou o grupo` : "Um grupo montou essa viagem"} e quer você
              na turma.
            </p>
            <p className="mt-2 text-sm text-muted">
              {convite.totalParticipantes} pessoa(s) já confirmada(s)
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {autenticado ? (
                <button
                  onClick={entrar}
                  disabled={entrando}
                  className="rounded-full bg-accent px-6 py-3 font-bold text-on-accent disabled:opacity-60"
                >
                  {entrando ? "Entrando..." : "Bora! Entrar no grupo"}
                </button>
              ) : (
                <>
                  <Link
                    to={`/cadastro?voltar=${caminhoAposLogin}`}
                    className="rounded-full bg-accent px-6 py-3 font-bold text-on-accent"
                  >
                    Criar conta e entrar
                  </Link>
                  <Link
                    to={`/entrar?voltar=${caminhoAposLogin}`}
                    className="rounded-full border border-line px-6 py-3 font-medium text-ink"
                  >
                    Já tenho conta
                  </Link>
                </>
              )}
            </div>

            {erro && (
              <p role="alert" className="mt-6 text-sm font-medium text-accent">
                {erro}
              </p>
            )}
          </>
        )}
      </motion.div>
    </main>
  );
}