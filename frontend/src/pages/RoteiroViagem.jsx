import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import ConfirmacaoModal from "../components/ConfirmacaoModal.jsx";
import { formatarDataBR } from "../utils/data.js";
import html2pdf from "html2pdf.js";

const PERIODOS = [
  { chave: "MANHA", rotulo: "Manhã" },
  { chave: "TARDE", rotulo: "Tarde" },
  { chave: "NOITE", rotulo: "Noite" },
];

const ROTULO_TIPO = {
  HOSPEDAGEM: "Hospedagem",
  PONTO_TURISTICO: "Ponto turístico",
  ATIVIDADE: "Atividade",
  RESTAURANTE: "Restaurante",
};

const moeda = (valor) =>
  typeof valor === "number" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;

const preco = (valor) => (valor === 0 ? "Grátis" : moeda(valor));

function Card({ rotulo, valor, detalhe }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{rotulo}</p>
      <p className="mt-2 font-display text-2xl leading-tight text-ink">{valor}</p>
      {detalhe && <p className="mt-1 text-sm text-muted">{detalhe}</p>}
    </div>
  );
}

function ItemCard({ item }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{ROTULO_TIPO[item.tipo]}</span>
        {preco(item.valor) && <span className="text-sm font-bold text-turq">{preco(item.valor)}</span>}
      </div>
      <h3 className="mt-2 font-display text-2xl leading-tight text-ink">{item.titulo}</h3>
      {item.descricao && <p className="mt-2 text-sm leading-relaxed text-muted">{item.descricao}</p>}
    </div>
  );
}

export default function RoteiroViagem() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const conteudoRef = useRef(null);
  const [viagem, setViagem] = useState(null);
  const [roteiro, setRoteiro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [erro, setErro] = useState("");
  const [datas, setDatas] = useState({ dataInicio: "", dataFim: "" });
  const [confirmarRegerar, setConfirmarRegerar] = useState(false);

  useEffect(() => {
    let ativo = true;

    Promise.all([
      api.buscarViagem(id),
      api.buscarRoteiro(id).catch((err) => {
        if (err.status === 404) return null;
        throw err;
      }),
    ])
      .then(([v, r]) => {
        if (!ativo) return;
        setViagem(v);
        setRoteiro(r);
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

  const souAdmin = viagem?.participantes.some((p) => p.usuarioId === usuario?.id && p.papel === "ADMIN");
  const precisaDatas = !viagem?.dataInicio || !viagem?.dataFim;
  const temDestino = Boolean(viagem?.destinoFinalId);

  async function gerar() {
    setErro("");

    if (precisaDatas) {
      if (!datas.dataInicio || !datas.dataFim) {
        setErro("Escolha as datas de ida e volta antes de montar o roteiro.");
        return;
      }
      if (datas.dataFim < datas.dataInicio) {
        setErro("A data de volta não pode ser antes da data de ida.");
        return;
      }
    }

    setGerando(true);
    try {
      const novo = await api.gerarRoteiro(id, precisaDatas ? datas : undefined);
      setRoteiro(novo);
      setViagem(await api.buscarViagem(id));
    } catch (err) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  }

  async function baixarPdf() {
    if (!conteudoRef.current) return;

    setGerandoPdf(true);
    setErro("");

    const destino = roteiro?.destino ?? viagem?.nome ?? "viagem";
    const nomeArquivo =
      `roteiro-${destino}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase() + ".pdf";

    try {
      await html2pdf()
        .set({
          margin: [12, 10],
          filename: nomeArquivo,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 2,
            backgroundColor: "#FFFFFF",
            onclone: (doc) => {
              doc.documentElement.removeAttribute("data-theme");
              doc.querySelectorAll("[data-pdf-ignore]").forEach((el) => el.remove());
            },
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"], avoid: [".rounded-2xl", ".rounded-3xl"] },
        })
        .from(conteudoRef.current)
        .save();
    } catch {
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerandoPdf(false);
    }
  }

  if (carregando) {
    return <main className="min-h-screen bg-bg px-6 py-12 text-muted">Carregando o roteiro...</main>;
  }

  const resumo = roteiro?.resumo;
  const hospedagem = resumo?.hospedagem;
  const pessoas = viagem?.participantes.filter((p) => p.statusConvite === "ACEITO").length ?? 0;

  const periodo =
    viagem?.dataInicio && viagem?.dataFim
      ? `${formatarDataBR(viagem.dataInicio)} até ${formatarDataBR(viagem.dataFim)}`
      : "Datas a definir";

  return (
    <main className="min-h-screen bg-bg px-6 py-12">
      <div ref={conteudoRef} className="mx-auto max-w-5xl">
        <Link to={`/viagens/${id}`} data-pdf-ignore className="text-sm font-bold text-accent">
          ← Voltar para a viagem
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-6 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-turq">Roteiro</p>
            <h1 className="mt-2 font-display text-6xl leading-none text-ink">
              {roteiro?.destino ?? viagem?.nome ?? "Roteiro"}
            </h1>
            <p className="mt-4 text-base text-muted">{periodo}</p>
          </div>

          {roteiro && (
            <div data-pdf-ignore className="flex flex-wrap gap-3">
              <button
                onClick={baixarPdf}
                disabled={gerandoPdf}
                className="rounded-full bg-turq px-5 py-2.5 font-bold text-on-accent disabled:opacity-60"
              >
                {gerandoPdf ? "Gerando PDF..." : "Baixar em PDF"}
              </button>
              {souAdmin && (
                <button
                  onClick={() => setConfirmarRegerar(true)}
                  disabled={gerando}
                  className="rounded-full border border-turq px-5 py-2.5 font-bold text-turq disabled:opacity-60"
                >
                  {gerando ? "Refazendo..." : "Refazer roteiro"}
                </button>
              )}
            </div>
          )}
        </motion.header>

        {erro && (
          <p role="alert" className="mt-6 font-medium text-accent">
            {erro}
          </p>
        )}

        {!temDestino && !roteiro && (
          <section className="mt-10 rounded-3xl border border-dashed border-line bg-card p-10">
            <p className="font-display text-3xl text-ink">Primeiro, o destino</p>
            <p className="mt-2 max-w-md text-muted">
              O roteiro é montado para o lugar escolhido pelo grupo. Assim que houver um destino definido, dá para
              gerar o roteiro.
            </p>
            <Link
              to={`/viagens/${id}/destinos`}
              className="mt-6 inline-block rounded-full bg-accent px-6 py-3 font-bold text-on-accent"
            >
              Ir para a votação
            </Link>
          </section>
        )}

        {temDestino && !roteiro && !souAdmin && (
          <section className="mt-10 rounded-3xl border border-dashed border-line bg-card p-10">
            <p className="font-display text-3xl text-ink">O roteiro ainda não saiu</p>
            <p className="mt-2 max-w-md text-muted">
              O admin do grupo vai montar o roteiro dia a dia. Você vai ver aqui assim que estiver pronto.
            </p>
          </section>
        )}

        {temDestino && !roteiro && souAdmin && (
          <section className="mt-10 rounded-3xl border border-line bg-card p-8">
            <p className="font-display text-3xl text-ink">Hora de montar o roteiro</p>
            <p className="mt-2 max-w-md text-muted">
              A IA usa o perfil do grupo e o menor orçamento informado para montar cada dia, com hospedagem,
              restaurantes e valores estimados.
            </p>

            {precisaDatas && (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="block text-sm font-medium text-ink">
                  Ida
                  <input
                    type="date"
                    value={datas.dataInicio}
                    onChange={(e) => setDatas((d) => ({ ...d, dataInicio: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink"
                  />
                </label>
                <label className="block text-sm font-medium text-ink">
                  Volta
                  <input
                    type="date"
                    value={datas.dataFim}
                    onChange={(e) => setDatas((d) => ({ ...d, dataFim: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink"
                  />
                </label>
              </div>
            )}

            <button
              onClick={gerar}
              disabled={gerando}
              className="mt-8 rounded-full bg-accent px-7 py-3 font-bold text-on-accent shadow-lg shadow-accent/30 disabled:opacity-60"
            >
              {gerando ? "Montando o roteiro..." : "Montar roteiro com a IA"}
            </button>

            {gerando && (
              <p className="mt-4 text-sm text-muted">Isso pode levar alguns segundos. Não feche a página.</p>
            )}
          </section>
        )}

        {roteiro && resumo && (
          <section className="mt-10">
            <h2 className="font-display text-3xl text-ink">Resumo da viagem</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card
                rotulo="Hospedagem"
                valor={hospedagem?.nome ?? "A definir"}
                detalhe={[hospedagem?.bairro, hospedagem?.tipo].filter(Boolean).join(" · ")}
              />
              <Card rotulo="Diária" valor={moeda(hospedagem?.precoDiaria) ?? "—"} detalhe="Por noite, para o grupo" />
              <Card rotulo="Orçamento" valor={moeda(resumo.orcamentoPorPessoa) ?? "Não informado"} detalhe="Por pessoa" />
              <Card rotulo="Pessoas" valor={pessoas} detalhe="Confirmadas na viagem" />
              <Card
                rotulo="Datas"
                valor={resumo.dataInicio ? formatarDataBR(resumo.dataInicio) : "—"}
                detalhe={resumo.dataFim ? `até ${formatarDataBR(resumo.dataFim)}` : null}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-turq/40 bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-turq">Custo estimado por pessoa</p>
              <p className="mt-1 font-display text-4xl text-ink">{moeda(resumo.custoEstimadoPorPessoa) ?? "—"}</p>
              {hospedagem?.motivo && <p className="mt-3 text-muted">{hospedagem.motivo}</p>}
              {resumo.observacoes && <p className="mt-2 text-sm text-muted">{resumo.observacoes}</p>}
              <p className="mt-3 text-xs text-muted">
                Valores aproximados, estimados pela IA. Confirme antes de reservar.
              </p>
            </div>
          </section>
        )}

        {roteiro && (
          <section className="mt-12 space-y-14">
            {roteiro.dias.map((dia, di) => {
              const temPeriodo = dia.itens.some((i) => i.periodo);

              return (
                <motion.div
                  key={dia.dia}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: di * 0.08, ease: "easeOut" }}
                >
                  <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
                    <div className="flex items-baseline gap-4">
                      <span className="font-display text-5xl text-accent">{String(dia.dia).padStart(2, "0")}</span>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-turq">Dia {dia.dia}</p>
                        {dia.data && <p className="font-display text-3xl text-ink">{formatarDataBR(dia.data)}</p>}
                      </div>
                    </div>
                    {dia.totalDia > 0 && (
                      <p className="text-sm text-muted">
                        Estimativa do dia: <span className="font-bold text-ink">{moeda(dia.totalDia)}</span>
                      </p>
                    )}
                  </div>

                  {temPeriodo ? (
                    <div className="mt-6 grid gap-6 md:grid-cols-3">
                      {PERIODOS.map((p) => {
                        const itens = dia.itens.filter((i) => i.periodo === p.chave);
                        return (
                          <div key={p.chave}>
                            <p className="mb-3 font-display text-2xl text-ink">{p.rotulo}</p>
                            <div className="space-y-3">
                              {itens.length === 0 && <p className="text-sm text-muted">Dia livre.</p>}
                              {itens.map((item) => (
                                <ItemCard key={item.id} item={item} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      {dia.itens.map((item) => (
                        <ItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </section>
        )}
      </div>

      <ConfirmacaoModal
        aberto={confirmarRegerar}
        titulo="Refazer o roteiro?"
        texto="O roteiro atual será substituído por um novo, montado pela IA. Essa ação não pode ser desfeita."
        textoConfirmar="Sim, refazer"
        textoCancelar="Cancelar"
        perigoso
        onConfirmar={() => {
          setConfirmarRegerar(false);
          gerar();
        }}
        onCancelar={() => setConfirmarRegerar(false)}
      />
    </main>
  );
}