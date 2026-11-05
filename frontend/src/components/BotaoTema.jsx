import { useState } from "react";
import { aplicarTema, lerTemaSalvo } from "../utils/tema.js";

function IconeSol() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

export default function BotaoTema() {
  const [tema, setTema] = useState(lerTemaSalvo);

  function alternar() {
    const novo = tema === "escuro" ? "claro" : "escuro";
    aplicarTema(novo);
    setTema(novo);
  }

  const escuro = tema === "escuro";
  const rotulo = escuro ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <button
      onClick={alternar}
      aria-label={rotulo}
      title={rotulo}
      className="fixed bottom-6 right-6 z-50 grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-ink shadow-lg transition hover:scale-105"
    >
      {escuro ? <IconeSol /> : <IconeLua />}
    </button>
  );
}