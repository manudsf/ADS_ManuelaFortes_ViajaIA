// Recebe "2026-12-20", "2026-12-20T00:00:00.000Z" ou um Date e devolve "20-12-2026".
// Lê a data pelos números, sem converter fuso horário, para o dia não mudar.
export function formatarDataBR(valor) {
  if (!valor) return "";
  const texto = valor instanceof Date ? valor.toISOString() : String(valor);
  const [ano, mes, dia] = texto.slice(0, 10).split("-");
  return `${dia}-${mes}-${ano}`;
}