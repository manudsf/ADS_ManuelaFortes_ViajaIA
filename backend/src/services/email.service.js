import nodemailer from "nodemailer";
import { prisma } from "../db.js";

const REMETENTE = process.env.EMAIL_FROM ?? "ViajaIA <nao-responda@viajaia.app>";
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

let transporter;
function obterTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 2525),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

const escapar = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function template({ titulo, texto, link, textoBotao }) {
  const botao = link
    ? `<p style="margin:32px 0"><a href="${link}" style="background:#E4735A;color:#FFFFFF;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:700">${escapar(textoBotao ?? "Abrir o ViajaIA")}</a></p>`
    : "";

  return `
  <div style="background:#FBF6EE;padding:40px;font-family:Arial,sans-serif;color:#13324A">
    <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:24px;padding:40px;border:1px solid #EADFCB">
      <p style="font-size:13px;letter-spacing:2px;color:#1B8A8C;font-weight:700">VIAJAIA</p>
      <h1 style="font-family:Georgia,serif;font-size:30px;margin:12px 0">${escapar(titulo)}</h1>
      <p style="font-size:16px;line-height:1.6;color:#3D5A6C">${escapar(texto)}</p>
      ${botao}
    </div>
  </div>`;
}

async function enviar({ para, assunto, html }) {
  try {
    await obterTransporter().sendMail({ from: REMETENTE, to: para, subject: assunto, html });
  } catch (error) {
    console.error(`Falha ao enviar e-mail para ${para}:`, error.message);
  }
}

export async function enviarConvite({ para, nomeViagem, nomeConvidador }) {
  await enviar({
    para,
    assunto: `${nomeConvidador} chamou você para "${nomeViagem}"`,
    html: template({
      titulo: "Você foi convidado!",
      texto: `${nomeConvidador} montou o grupo "${nomeViagem}" e quer você na turma. Entre no ViajaIA para aceitar ou recusar o convite.`,
      link: `${APP_URL}/viagens`,
      textoBotao: "Ver meu convite",
    }),
  });
}

export async function notificarParticipantes(viagemId, { assunto, titulo, texto, link, textoBotao }) {
  try {
    const participantes = await prisma.participanteViagem.findMany({
      where: { viagemId, statusConvite: "ACEITO" },
      include: { usuario: { select: { email: true } } },
    });

    await Promise.allSettled(
      participantes.map((p) =>
        enviar({
          para: p.usuario.email,
          assunto,
          html: template({ titulo, texto, link, textoBotao }),
        })
      )
    );
  } catch (error) {
    console.error("Falha ao notificar participantes:", error.message);
  }
}

export async function enviarLembreteConversa(viagemId) {
  const pendentes = await prisma.participanteViagem.findMany({
    where: { viagemId, statusConvite: "ACEITO", conversaConcluidaEm: null },
    include: { usuario: { select: { email: true } } },
  });

  await Promise.allSettled(
    pendentes.map((p) =>
      enviar({
        para: p.usuario.email,
        assunto: "Falta pouco para o grupo avançar",
        html: template({
          titulo: "Conta pro agente o que você curte",
          texto: "Seu grupo está esperando a sua conversa com a IA para seguir com as sugestões de destino. Leva uns minutinhos.",
          link: `${APP_URL}/viagens/${viagemId}`,
          textoBotao: "Conversar com o agente",
        }),
      })
    )
  );

  return pendentes.length;
}