import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ITENS = [
  { para: "/perfil", rotulo: "Meu perfil", icone: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },

  { para: "/viagens", rotulo: "Minhas viagens", icone: "M3 12l9-9 9 9M5 10v10h14V10" },

  { para: "/viagens/nova", rotulo: "Nova viagem", icone: "M12 5v14M5 12h14" },
  
];

const ICONE_SAIR = "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9";
const ICONE_MENU = "M4 6h16M4 12h16M4 18h16";
const ICONE_FECHAR = "M6 6l12 12M18 6L6 18";

function Icone({ caminho, className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={caminho} />
    </svg>
  );
}

export default function MenuApp({ aberto, onAlternar }) {
  const { sair } = useAuth();
  const navigate = useNavigate();

  function handleSair() {
    sair();
    navigate("/entrar");
  }

  return (
    <>
      {/* Desktop: barra lateral recolhível */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-card py-8 transition-all duration-300 md:flex ${
          aberto ? "w-60 px-5" : "w-20 items-center px-3"
        }`}
      >
        <div className={`flex items-center ${aberto ? "justify-between" : "justify-center"}`}>
          {aberto && <p className="font-display text-3xl text-ink">ViajaIA</p>}
          <button
            onClick={onAlternar}
            aria-label={aberto ? "Recolher menu" : "Abrir menu"}
            title={aberto ? "Recolher menu" : "Abrir menu"}
            className="grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-line/40"
          >
            <Icone caminho={aberto ? ICONE_FECHAR : ICONE_MENU} />
          </button>
        </div>

        <nav className={`mt-10 flex flex-col gap-2 ${aberto ? "" : "items-center"}`}>
          {ITENS.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end
              title={item.rotulo}
              className={({ isActive }) =>
                `flex items-center rounded-2xl font-medium transition ${
                  aberto ? "gap-3 px-4 py-3" : "h-11 w-11 justify-center"
                } ${isActive ? "bg-accent text-on-accent" : "text-ink hover:bg-line/40"}`
              }
            >
              <Icone caminho={item.icone} />
              {aberto && item.rotulo}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleSair}
          title="Sair"
          className={`mt-auto flex items-center rounded-2xl font-medium text-muted transition hover:bg-line/40 hover:text-ink ${
            aberto ? "gap-3 px-4 py-3" : "h-11 w-11 justify-center"
          }`}
        >
          <Icone caminho={ICONE_SAIR} />
          {aberto && "Sair"}
        </button>
      </aside>

      {/* Celular: barra inferior fixa */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-card px-2 py-3 md:hidden">
        {ITENS.map((item) => (
          <NavLink
            key={item.para}
            to={item.para}
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-xs font-medium ${
                isActive ? "text-accent" : "text-muted"
              }`
            }
          >
            <Icone caminho={item.icone} />
            {item.rotulo}
          </NavLink>
        ))}
        <button
          onClick={handleSair}
          className="flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-xs font-medium text-muted"
        >
          <Icone caminho={ICONE_SAIR} />
          Sair
        </button>
      </nav>
    </>
  );
}