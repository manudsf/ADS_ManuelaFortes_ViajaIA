import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import CampoData from "../components/CampoData.jsx";
import { formatarDataBR, paraIso } from "../utils/data.js";
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

const LIMITE_PARADAS_MAPS = 10;

const moeda = (valor) =>
  typeof valor === "number" ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;

const preco = (valor) => (valor === 0 ? "Grátis" : moeda(valor));

// Monta a URL de rota do Google Maps com as paradas do dia, na ordem do roteiro.
function linkMapsDoDia(dia, destino) {
  const paradas = dia.itens
    .map((item) => `${item.titulo}${destino ? `, ${destino}` : ""}`)
    .slice(0, LIMITE_PARADAS_MAPS);

  return `https://www.google.com/maps/dir/${paradas.map((p) => encodeURIComponent(p)).join("/")}`;
}

// Monta a busca de voos no Google Flights com o destino e as datas do roteiro.
function linkGoogleFlights(destino, dataInicio, dataFim) {
  const partes = [`Flights to ${destino}`];
  if (dataInicio && dataFim) partes.push(`on ${dataInicio} through ${dataFim}`);

  return `https://www.google.com/travel/flights?q=${encodeURIComponent(partes.join(" "))}`;
}

// Converte qualquer cor moderna (oklch, lab, color-mix...) para rgb(), que o html2canvas entende.
function converterParaRgb(cor) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "rgba(0, 0, 0, 0)";
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, 1, 1);

  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`;
}

const PROPRIEDADES_COR = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
];

function Card({ rotulo, valor, detalhe }) {
  return (
    <div className="pdf-card rounded-2xl border border-line bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{rotulo}</p>
      <p className="mt-2 font-display text-2xl leading-tight text-ink">{valor}</p>
      {detalhe && <p className="mt-1 text-sm text-muted">{detalhe}</p>}
    </div>
  );
}

function ItemCard({ item }) {
  return (
    <div className="pdf-card rounded-2xl border border-line bg-card p-5">
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
  const [ajustes, setAjustes] = useState("");
  const [mostrarAjustes, setMostrarAjustes] = useState(false);

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

  async function gerar({ comAjustes = false } = {}) {
    setErro("");

    const corpo = {};

    // Datas são opcionais. Se a pessoa preencher uma, precisa preencher as duas.
    if (precisaDatas && (datas.dataInicio || datas.dataFim)) {
      const dataInicio = paraIso(datas.dataInicio);
      const dataFim = paraIso(datas.dataFim);

      if (!dataInicio || !dataFim) {
        setErro("Informe as duas datas no formato dd/mm/aaaa, por exemplo 20/12/2026.");
        return;
      }
      if (dataFim < dataInicio) {
        setErro("A data de volta não pode ser antes da data de ida.");
        return;
      }
      corpo.dataInicio = dataInicio;
      corpo.dataFim = dataFim;
    }

    if (comAjustes && ajustes.trim()) {
      corpo.ajustes = ajustes.trim();
    }

    setGerando(true);
    try {
      const novo = await api.gerarRoteiro(id, corpo);
      setRoteiro(novo);
      setViagem(await api.buscarViagem(id));
      setAjustes("");
      setMostrarAjustes(false);
    } catch (err) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  }

  function abrirDiaNoMaps(dia) {
    const destinoTexto = roteiro?.destino ?? viagem?.nome ?? "";
    window.open(linkMapsDoDia(dia, destinoTexto), "_blank", "noopener");
  }

  function buscarVoos() {
    const destinoTexto = roteiro?.destino ?? viagem?.nome ?? "";
    const inicio = roteiro?.resumo?.dataInicio ?? (viagem?.dataInicio ? String(viagem.dataInicio).slice(0, 10) : null);
    const fim = roteiro?.resumo?.dataFim ?? (viagem?.dataFim ? String(viagem.dataFim).slice(0, 10) : null);
    window.open(linkGoogleFlights(destinoTexto, inicio, fim), "_blank", "noopener");
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

              doc.querySelectorAll("*").forEach((el) => {
                el.style.transform = "none";
                el.style.transition = "none";
                el.style.animation = "none";
                el.style.opacity = "1";

                const estilo = doc.defaultView.getComputedStyle(el);

                PROPRIEDADES_COR.forEach((prop) => {
                  const valor = estilo[prop];
                  if (valor && /oklch|oklab|lab\(|lch\(|color\(|color-mix/.test(valor)) {
                    el.style[prop] = converterParaRgb(valor);
                  }
                });

                el.style.boxShadow = "none";
                el.style.textShadow = "none";
              });

              doc.querySelectorAll(".pdf-card, .pdf-dia").forEach((el) => {
                el.style.breakInside = "avoid";
                el.style.pageBreakInside = "avoid";
              });
            },
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: {
            mode: ["css", "legacy"],
            avoid: [".pdf-card", ".pdf-dia"],
          },
        })
        .from(conteudoRef.current)
        .save();
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
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
              <button
                onClick={buscarVoos}
                className="rounded-full border border-turq px-5 py-2.5 font-bold text-turq"
              >
                Buscar voos
              </button>
              {souAdmin && (
                <button
                  onClick={() => setMostrarAjustes((v) => !v)}
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

        {roteiro && souAdmin && mostrarAjustes && (
          <section data-pdf-ignore className="mt-6 rounded-3xl border border-line bg-card p-6">
            <p className="font-display text-2xl text-ink">O que o grupo gostaria de mudar?</p>
            <p className="mt-1 text-sm text-muted">
              Escreva com as suas palavras. Pode incluir datas, como "ir de 10 a 15 de janeiro", menos passeios pagos
              ou mais tempo na praia.
            </p>
            <textarea
              value={ajustes}
              onChange={(e) => setAjustes(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Ex.: queremos ir de 10 a 15 de janeiro e menos passeios de barco"
              className="mt-4 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => gerar({ comAjustes: true })}
                disabled={gerando || !ajustes.trim()}
                className="rounded-full bg-accent px-6 py-2.5 font-bold text-on-accent disabled:opacity-60"
              >
                {gerando ? "Refazendo..." : "Refazer com esses ajustes"}
              </button>
              <button
                onClick={() => gerar()}
                disabled={gerando}
                className="rounded-full border border-line px-6 py-2.5 font-medium text-ink disabled:opacity-60"
              >
                Refazer sem ajustes
              </button>
            </div>
          </section>
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
              <>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <CampoData
                    label="Ida (opcional)"
                    value={datas.dataInicio}
                    onChange={(v) => setDatas((d) => ({ ...d, dataInicio: v }))}
                  />
                  <CampoData
                    label="Volta (opcional)"
                    value={datas.dataFim}
                    onChange={(v) => setDatas((d) => ({ ...d, dataFim: v }))}
                  />
                </div>
                <p className="mt-3 text-sm text-muted">
                  Se deixar as datas em branco, a IA escolhe o período pelo que o grupo contou nas conversas.
                </p>
              </>
            )}

            <button
              onClick={() => gerar()}
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
            {resumo.datasDefinidasPelaIA && (
              <p className="mt-2 text-sm text-muted">
                As datas foram sugeridas pela IA com base nas conversas.
                {resumo.pedidoAjuste ? ` Último ajuste pedido: "${resumo.pedidoAjuste}".` : ""}
              </p>
            )}
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

            <div className="pdf-card mt-4 rounded-2xl border border-turq/40 bg-card p-5">
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
                  className="pdf-dia"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: di * 0.08, ease: "easeOut" }}
                >
                  <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
                    <div className="flex items-baseline gap-4">
                      <span className="font-display text-5xl text-accent [font-variant-numeric:lining-nums]">
                        {String(dia.dia).padStart(2, "0")}
                      </span>
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-turq">Dia {dia.dia}</p>
                        {dia.data && <p className="font-display text-3xl text-ink">{formatarDataBR(dia.data)}</p>}
                      </div>
                    </div>

                    <div data-pdf-ignore className="flex flex-wrap items-center gap-4">
                      {dia.totalDia > 0 && (
                        <p className="text-sm text-muted">
                          Estimativa do dia: <span className="font-bold text-ink">{moeda(dia.totalDia)}</span>
                        </p>
                      )}
                      {dia.itens.length > 0 && (
                        <button
                          onClick={() => abrirDiaNoMaps(dia)}
                          className="rounded-full border border-turq px-4 py-2 text-sm font-bold text-turq transition hover:bg-turq hover:text-on-accent"
                        >
                          Abrir o dia no Google Maps
                        </button>
                      )}
                    </div>
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
    </main>
  );
}