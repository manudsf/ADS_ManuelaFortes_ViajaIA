import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";

const foto = (n) => `/imagens/fundo/${n}.jpg`;

const PASSOS = [
  { n: "01", titulo: "Chama a turma", texto: "Convide por e-mail ou por link. Quem entra, já entra no grupo." },
  { n: "02", titulo: "Conta o que curte", texto: "Um papo rápido com o agente: orçamento, vibe e o que não pode faltar." },
  { n: "03", titulo: "Vota no lugar", texto: "A IA sugere três destinos. Um voto por pessoa, e o mais votado ganha." },
  { n: "04", titulo: "Recebe o roteiro", texto: "Dia a dia, com hospedagem, restaurantes e uma estimativa do que vai custar." },
];

const FUNCIONALIDADES = [
  { titulo: "Papo com a IA", texto: "Um agente que lembra tudo o que foi dito e pergunta só o que falta.", foto: 2 },
  { titulo: "Votação sem treta", texto: "Um voto por pessoa, e o resultado aparece para todo mundo.", foto: 3 },
  { titulo: "Roteiro com cara de férias", texto: "Manhã, tarde e noite, com restaurantes e valores estimados.", foto: 4 },
  { titulo: "Conta dividida", texto: "Quem pagou o quê, quem deve para quem, e o menor número de pagamentos para zerar.", foto: 6 },
];

const DESTINOS = [
  { nome: "Fernando de Noronha", lugar: "Pernambuco", foto: 2 },
  { nome: "Gramado", lugar: "Rio Grande do Sul", foto: 3 },
  { nome: "Cancún", lugar: "México", foto: 4 },
  { nome: "Chapada dos Veadeiros", lugar: "Goiás", foto: 8 },
  { nome: "Bariloche", lugar: "Argentina", foto: 6 },
];

function Reveal({ children, atraso = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: atraso, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Carrossel({ children }) {
  const trilho = useRef(null);

  function mover(direcao) {
    trilho.current?.scrollBy({ left: direcao * trilho.current.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={trilho}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => mover(-1)}
          aria-label="Ver anteriores"
          className="grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-xl text-ink transition hover:border-turq"
        >
          ‹
        </button>
        <button
          onClick={() => mover(1)}
          aria-label="Ver próximos"
          className="grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-xl text-ink transition hover:border-turq"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export default function Landing() {
  const { autenticado } = useAuth();
  const destinoPrincipal = autenticado ? "/viagens" : "/cadastro";

  return (
    <main className="min-h-screen bg-bg text-ink">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-3xl">ViajaIA</span>
        <div className="flex items-center gap-6 text-sm font-medium">
          <a href="#como-funciona" className="hidden text-muted transition hover:text-ink md:inline">
            Como funciona
          </a>
          <a href="#funcoes" className="hidden text-muted transition hover:text-ink md:inline">
            Funções
          </a>
          <a href="#destinos" className="hidden text-muted transition hover:text-ink md:inline">
            Destinos
          </a>
          {autenticado ? (
            <Link to="/viagens" className="rounded-full bg-accent px-5 py-2.5 font-bold text-on-accent">
              Minhas viagens
            </Link>
          ) : (
            <>
              <Link to="/entrar" className="text-ink">
                Entrar
              </Link>
              <Link to="/cadastro" className="rounded-full bg-accent px-5 py-2.5 font-bold text-on-accent">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6">
        <div className="relative min-h-[85vh] overflow-hidden rounded-[2rem]">
          <img src={foto(1)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 70%, transparent) 45%, transparent 100%)",
            }}
          />

          <div className="relative flex min-h-[85vh] max-w-xl flex-col justify-center px-8 py-16 md:px-14">
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-turq">
                Sua turma, seu destino, zero bate-cabeça
              </p>
              <h1 className="mt-4 font-display text-6xl leading-[1.02] md:text-7xl">
                Chama a galera. A viagem se organiza sozinha.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted">
                A IA conversa com cada um, a turma vota no lugar e o roteiro chega pronto: onde ficar, o que comer e
                quanto vai custar.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to={destinoPrincipal}
                  className="rounded-full bg-accent px-8 py-4 font-bold text-on-accent shadow-lg shadow-accent/30 transition hover:-translate-y-0.5"
                >
                  {autenticado ? "Ir para minhas viagens" : "Montar minha turma"}
                </Link>
                <a href="#como-funciona" className="flex items-center rounded-full border border-line px-8 py-4 font-bold text-ink">
                  Ver como funciona
                </a>
              </div>
              <p className="mt-8 text-sm text-muted">Sem agência, sem planilha e sem grupo de WhatsApp em modo pânico.</p>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="font-display text-5xl">Quatro passos e a viagem sai do papel</h2>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-4">
          {PASSOS.map((passo, i) => (
            <Reveal key={passo.n} atraso={i * 0.08} className="rounded-3xl border border-line bg-card p-7">
              <span className="font-display text-5xl text-gold">{passo.n}</span>
              <h3 className="mt-5 font-display text-2xl">{passo.titulo}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{passo.texto}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="funcoes" className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <h2 className="font-display text-5xl">Tudo que a turma precisa, num lugar só</h2>
        </Reveal>
        <div className="mt-12">
          <Carrossel>
            {FUNCIONALIDADES.map((f) => (
              <article
                key={f.titulo}
                className="w-[300px] shrink-0 snap-start overflow-hidden rounded-3xl border border-line bg-card md:w-[360px]"
              >
                <img src={foto(f.foto)} alt="" className="h-52 w-full object-cover" />
                <div className="p-7">
                  <h3 className="font-display text-2xl">{f.titulo}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{f.texto}</p>
                </div>
              </article>
            ))}
          </Carrossel>
        </div>
      </section>

      <section id="destinos" className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <h2 className="font-display text-5xl">Para onde a turma pode ir</h2>
          <p className="mt-3 text-muted">Sugestões que a IA pode fazer para o seu grupo.</p>
        </Reveal>
        <div className="mt-12">
          <Carrossel>
            {DESTINOS.map((d) => (
              <article
                key={d.nome}
                className="group relative h-[420px] w-[260px] shrink-0 snap-start overflow-hidden rounded-3xl md:w-[300px]"
              >
                <img
                  src={foto(d.foto)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div
                  className="absolute inset-x-0 bottom-0 p-6"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">{d.lugar}</p>
                  <h3 className="mt-1 font-display text-3xl leading-tight text-white">{d.nome}</h3>
                </div>
              </article>
            ))}
          </Carrossel>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-line bg-card p-10">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-muted">Sem o ViajaIA</p>
              <ul className="mt-6 space-y-4 text-muted">
                <li>Um grupo de WhatsApp com mil mensagens não lidas</li>
                <li>Uma planilha que ninguém atualiza</li>
                <li>Uma decisão que nunca sai do papo</li>
                <li>Uma agência cobrando taxa de sorriso</li>
              </ul>
            </div>
            <div className="rounded-3xl bg-turq p-10 text-on-accent">
              <p className="text-sm font-bold uppercase tracking-[0.18em] opacity-80">Com o ViajaIA</p>
              <ul className="mt-6 space-y-4">
                <li>Tudo no mesmo lugar</li>
                <li>A IA faz a pesquisa chata por vocês</li>
                <li>Votação e decisão em poucos minutos</li>
                <li>Dinheiro dividido sem briga</li>
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] p-12 md:p-16">
            <img src={foto(10)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-bg/80" />
            <div className="relative max-w-2xl">
              <h2 className="font-display text-5xl leading-tight">Sua próxima viagem em grupo começa agora.</h2>
              <p className="mt-4 text-lg text-muted">Crie a conta, chame a turma e deixe o resto com a gente.</p>
              <Link
                to={destinoPrincipal}
                className="mt-8 inline-block rounded-full bg-accent px-8 py-4 font-bold text-on-accent shadow-lg shadow-accent/30"
              >
                {autenticado ? "Ir para minhas viagens" : "Criar minha conta"}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line px-6 py-10 text-center text-sm text-muted">
        ViajaIA · Projeto de TCC · UPF 2026
      </footer>
    </main>
  );
}