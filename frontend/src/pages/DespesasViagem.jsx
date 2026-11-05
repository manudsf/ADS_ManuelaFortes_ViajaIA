import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import ConfirmacaoModal from "../components/ConfirmacaoModal.jsx";
import { formatarDataBR } from "../utils/data.js";

const moeda = (valor) =>
  (Number(valor) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const FORM_VAZIO = { descricao: "", valor: "", dividirCom: [] };

function lerValor(texto) {
  return Number(String(texto).replace(",", "."));
}

export default function DespesasViagem() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [viagem, setViagem] = useState(null);
  const [despesas, setDespesas] = useState([]);
  const [saldos, setSaldos] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [historicos, setHistoricos] = useState({});

  const membros = viagem?.participantes.filter((p) => p.statusConvite === "ACEITO") ?? [];

  useEffect(() => {
    let ativo = true;

    Promise.all([api.buscarViagem(id), api.listarDespesas(id), api.calcularSaldos(id)])
      .then(([v, lista, calculo]) => {
        if (!ativo) return;
        setViagem(v);
        setDespesas(lista);
        setSaldos(calculo);
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

  async function recarregar() {
    const [lista, calculo] = await Promise.all([api.listarDespesas(id), api.calcularSaldos(id)]);
    setDespesas(lista);
    setSaldos(calculo);
    setHistoricos({});
  }

  function abrirNova() {
    setEditando(null);
    setForm({ ...FORM_VAZIO, dividirCom: membros.map((m) => m.usuarioId) });
    setFormAberto(true);
    setErro("");
    setAviso("");
  }

  function abrirEdicao(d) {
    setEditando(d);
    setForm({
      descricao: d.descricao,
      valor: String(d.valor).replace(".", ","),
      dividirCom: d.participacoes.map((p) => p.usuarioId),
    });
    setFormAberto(true);
    setErro("");
    setAviso("");
  }

  function fecharForm() {
    setFormAberto(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  }

  function alternarPessoa(usuarioId) {
    setForm((f) => ({
      ...f,
      dividirCom: f.dividirCom.includes(usuarioId)
        ? f.dividirCom.filter((x) => x !== usuarioId)
        : [...f.dividirCom, usuarioId],
    }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setAviso("");

    const valor = lerValor(form.valor);

    if (!form.descricao.trim()) {
      setErro("Dê um nome para a despesa, como 'Jantar de sábado'.");
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    if (form.dividirCom.length === 0) {
      setErro("Marque pelo menos uma pessoa para dividir essa conta.");
      return;
    }

    const dados = { descricao: form.descricao.trim(), valor, participantesIds: form.dividirCom };

    setSalvando(true);
    try {
      if (editando) {
        await api.editarDespesa(id, editando.id, dados);
        setAviso("Despesa atualizada. Os saldos já foram recalculados.");
      } else {
        await api.criarDespesa(id, dados);
        setAviso("Despesa registrada!");
      }
      fecharForm();
      await recarregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    const d = paraExcluir;
    setParaExcluir(null);
    setErro("");
    setAviso("");
    try {
      await api.excluirDespesa(id, d.id);
      setAviso("Despesa excluída. Os saldos já foram recalculados.");
      await recarregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function alternarHistorico(d) {
    if (historicos[d.id]) {
      setHistoricos((h) => {
        const copia = { ...h };
        delete copia[d.id];
        return copia;
      });
      return;
    }
    try {
      const lista = await api.historicoDespesa(id, d.id);
      setHistoricos((h) => ({ ...h, [d.id]: lista }));
    } catch (err) {
      setErro(err.message);
    }
  }

  if (carregando) {
    return <main className="min-h-screen bg-bg px-6 py-12 text-muted">Carregando as despesas...</main>;
  }

  const totalGasto = saldos?.totalGasto ?? 0;
  const meu = saldos?.saldos.find((s) => s.id === usuario?.id);
  const transferencias = saldos?.transferencias ?? [];

  const valorDigitado = lerValor(form.valor);
  const porPessoa =
    form.dividirCom.length > 0 && Number.isFinite(valorDigitado) && valorDigitado > 0
      ? valorDigitado / form.dividirCom.length
      : null;

  return (
    <main className="min-h-screen bg-bg px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link to={`/viagens/${id}`} className="text-sm font-bold text-muted transition hover:text-accent">
          ← Voltar para a viagem
        </Link>

        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mt-6 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-turq">Despesas</p>
            <h1 className="mt-2 font-display text-5xl leading-tight text-ink">Quem deve o quê</h1>
            <p className="mt-3 text-muted">
              Total gasto pelo grupo: <span className="font-bold text-ink">{moeda(totalGasto)}</span>
            </p>
          </div>

          {!formAberto && (
            <button
              onClick={abrirNova}
              className="rounded-full bg-accent px-6 py-3 font-bold text-on-accent shadow-lg shadow-accent/30"
            >
              Adicionar despesa
            </button>
          )}
        </motion.header>

        {erro && (
          <p role="alert" className="mt-6 font-medium text-accent">
            {erro}
          </p>
        )}
        {aviso && <p className="mt-6 font-medium text-turq">{aviso}</p>}

        {meu && (
          <section className="mt-8 rounded-3xl border border-turq/40 bg-card p-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-turq">Seu saldo</p>
            {Math.abs(meu.valor) < 0.01 ? (
              <p className="mt-2 font-display text-4xl text-ink">Você está quite com o grupo</p>
            ) : meu.valor > 0 ? (
              <p className="mt-2 font-display text-4xl text-ink">
                Você recebe <span className="text-turq">{moeda(meu.valor)}</span>
              </p>
            ) : (
              <p className="mt-2 font-display text-4xl text-ink">
                Você deve <span className="text-accent">{moeda(-meu.valor)}</span>
              </p>
            )}
          </section>
        )}

        <section className="mt-10">
          <h2 className="font-display text-2xl text-ink">Como zerar as contas</h2>
          {transferencias.length === 0 ? (
            <p className="mt-3 text-muted">Ninguém deve nada no momento.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">
                Esse é o menor número de pagamentos para todo mundo ficar quite.
              </p>
              <ul className="mt-4 grid gap-3">
                {transferencias.map((t, i) => {
                  const envolvido = t.de.id === usuario?.id || t.para.id === usuario?.id;
                  return (
                    <li
                      key={i}
                      className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card px-5 py-4 ${
                        envolvido ? "border-turq" : "border-line"
                      }`}
                    >
                      <p className="text-ink">
                        <span className="font-bold">{t.de.id === usuario?.id ? "Você" : t.de.nome}</span> paga para{" "}
                        <span className="font-bold">{t.para.id === usuario?.id ? "você" : t.para.nome}</span>
                      </p>
                      <span className="font-display text-2xl text-ink">{moeda(t.valor)}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>

        {formAberto && (
          <motion.form
            onSubmit={salvar}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-10 rounded-3xl border border-line bg-card p-8"
          >
            <h2 className="font-display text-3xl text-ink">{editando ? "Editar despesa" : "Nova despesa"}</h2>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-medium text-ink">
                Descrição
                <input
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex.: Jantar de sábado"
                  className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted"
                />
              </label>
              <label className="block text-sm font-medium text-ink">
                Valor (R$)
                <input
                  inputMode="decimal"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                  className="mt-2 w-full rounded-xl border border-line bg-bg px-4 py-3 text-ink placeholder:text-muted"
                />
              </label>
            </div>

            <fieldset className="mt-6">
              <legend className="text-sm font-medium text-ink">Quem divide essa conta?</legend>
              <p className="mt-1 text-sm text-muted">Todos começam marcados. Desmarque quem não participou.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {membros.map((m) => {
                  const marcado = form.dividirCom.includes(m.usuarioId);
                  return (
                    <label
                      key={m.usuarioId}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-ink ${
                        marcado ? "border-turq bg-bg" : "border-line bg-bg opacity-70"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternarPessoa(m.usuarioId)}
                        className="h-4 w-4 accent-turq"
                      />
                      <span>
                        {m.usuario.nome}
                        {m.usuarioId === usuario?.id && <span className="text-muted"> (você)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {porPessoa && (
              <p className="mt-5 text-sm text-muted">
                Cada pessoa fica com <span className="font-bold text-ink">{moeda(porPessoa)}</span>.
              </p>
            )}

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={fecharForm}
                className="rounded-full border border-line px-5 py-2.5 font-medium text-ink"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-full bg-accent px-6 py-2.5 font-bold text-on-accent disabled:opacity-60"
              >
                {salvando ? "Salvando..." : "Salvar despesa"}
              </button>
            </div>
          </motion.form>
        )}

        <section className="mt-12">
          <h2 className="font-display text-2xl text-ink">Lançamentos</h2>

          {despesas.length === 0 ? (
            <p className="mt-4 rounded-3xl border border-dashed border-line bg-card p-8 text-muted">
              Nenhuma despesa ainda. Quando alguém pagar algo do grupo, registre aqui.
            </p>
          ) : (
            <ul className="mt-5 grid gap-4">
              {despesas.map((d) => {
                const minhaParte = d.participacoes.find((p) => p.usuarioId === usuario?.id)?.valorDevido;
                const souPagador = d.pagoPorId === usuario?.id;
                const historico = historicos[d.id];

                return (
                  <li key={d.id} className="rounded-3xl border border-line bg-card p-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-2xl text-ink">{d.descricao}</p>
                        <p className="mt-1 text-sm text-muted">
                          Pago por {souPagador ? "você" : d.pagoPor.nome} · {formatarDataBR(d.criadoEm)} · dividido
                          entre {d.participacoes.length} pessoa(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-3xl text-ink">{moeda(d.valor)}</p>
                        {minhaParte !== undefined && (
                          <p className="text-sm text-muted">
                            Sua parte: <span className="font-bold text-ink">{moeda(minhaParte)}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-4 text-sm font-bold">
                      {souPagador && (
                        <>
                          <button onClick={() => abrirEdicao(d)} className="text-turq">
                            Editar
                          </button>
                          <button onClick={() => setParaExcluir(d)} className="text-accent">
                            Excluir
                          </button>
                        </>
                      )}
                      <button onClick={() => alternarHistorico(d)} className="text-muted">
                        {historico ? "Ocultar histórico" : "Ver histórico"}
                      </button>
                    </div>

                    {historico && (
                      <ul className="mt-4 space-y-2 border-l border-line pl-4">
                        {historico.map((h) => (
                          <li key={h.id} className="text-sm text-muted">
                            {formatarDataBR(h.criadoEm)} · {h.descricao}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ConfirmacaoModal
        aberto={Boolean(paraExcluir)}
        titulo="Excluir esta despesa?"
        texto="Os valores de todo o grupo vão ser recalculados. O histórico continua registrado."
        textoConfirmar="Sim, excluir"
        textoCancelar="Cancelar"
        perigoso
        onConfirmar={confirmarExclusao}
        onCancelar={() => setParaExcluir(null)}
      />
    </main>
  );
}