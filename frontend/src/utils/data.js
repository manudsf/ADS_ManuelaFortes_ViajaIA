// Recebe "2026-12-20", "2026-12-20T00:00:00.000Z" ou um Date e devolve "20-12-2026".
// Lê a data pelos números, sem converter fuso horário, para o dia não mudar.
export function formatarDataBR(valor) {
  if (!valor) return "";
  const texto = valor instanceof Date ? valor.toISOString() : String(valor);
  const [ano, mes, dia] = texto.slice(0, 10).split("-");
  return `${dia}-${mes}-${ano}`;
}

// Mantém só números e aplica a máscara dd/mm/aaaa enquanto a pessoa digita.
export function mascararData(texto) {
  const numeros = texto.replace(/\D/g, "").slice(0, 8);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

// Converte "20/12/2026" para "2026-12-20", que é o formato da API.
// Retorna null se a data não existir (ex.: 31/02/2026).
export function paraIso(dataBR) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBR ?? "");
  if (!m) return null;

  const [, dia, mes, ano] = m;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  const valida =
    data.getFullYear() === Number(ano) &&
    data.getMonth() === Number(mes) - 1 &&
    data.getDate() === Number(dia);

  return valida ? `${ano}-${mes}-${dia}` : null;
}