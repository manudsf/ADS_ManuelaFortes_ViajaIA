import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const MODELOS = ["gemini-3.6-flash", "gemini-3.1-flash-lite"];
const TENTATIVAS_POR_MODELO = 2;
const STATUS_TEMPORARIOS = [429, 500, 503, 504];

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function gerarTexto({ contents, systemInstruction }) {
  for (const modelo of MODELOS) {
    for (let tentativa = 1; tentativa <= TENTATIVAS_POR_MODELO; tentativa++) {
      try {
        const resposta = await ai.models.generateContent({
          model: modelo,
          contents,
          ...(systemInstruction && { config: { systemInstruction } }),
        });
        return resposta.text;
      } catch (error) {
        if (error.status === 404) {
          console.warn(`Modelo ${modelo} não encontrado, tentando o próximo.`);
          break;
        }

        if (!STATUS_TEMPORARIOS.includes(error.status)) {
          throw error;
        }

        console.warn(`Gemini (${modelo}) falhou com ${error.status} (tentativa ${tentativa}).`);
        if (tentativa < TENTATIVAS_POR_MODELO) {
          await esperar(1500 * tentativa);
        }
      }
    }
  }

  throw new Error("IA_INDISPONIVEL");
}