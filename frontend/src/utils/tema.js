const CHAVE = "viajaia_tema";

export function lerTemaSalvo() {
  return localStorage.getItem(CHAVE) === "escuro" ? "escuro" : "claro";
}

export function aplicarTema(tema) {
  if (tema === "escuro") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem(CHAVE, tema);
}