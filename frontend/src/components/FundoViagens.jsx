import { useEffect, useState } from "react";

const IMAGENS = [
  "/imagens/fundo/14.jpg",
  "/imagens/fundo/3.jpg",
  "/imagens/fundo/16.jpg",
  "/imagens/fundo/6.jpg",
  "/imagens/fundo/15.jpg",
  "/imagens/fundo/8.jpg",
  "/imagens/fundo/10.jpg",
  "/imagens/fundo/11.jpg",
  "/imagens/fundo/12.jpg",
  "/imagens/fundo/13.jpg"
];

export default function FundoViagens({ intervalo = 4000 }) {
  const [slide, setSlide] = useState({ atual: 0, anterior: null });

  useEffect(() => {
    const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzirMovimento) return;

    const timer = setInterval(() => {
      setSlide((s) => ({
        anterior: s.atual,
        atual: (s.atual + 1) % IMAGENS.length,
      }));
    }, intervalo);

    return () => clearInterval(timer);
  }, [intervalo]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {IMAGENS.map((src, i) => {
        const ativa = i === slide.atual;
        const ultima = i === slide.anterior;

        return (
          <div
            key={src}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${src})`,
              opacity: ativa || ultima ? 1 : 0,
              zIndex: ativa ? 20 : ultima ? 10 : 0,
              transform: ativa ? "scale(1.12)" : "scale(1)",
              transition: "opacity 2.5s ease-in-out, transform 12s linear",
            }}
          />
        );
      })}

      {/* Véu por cima das fotos, com a cor de fundo do tema */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 30,
          background: "color-mix(in srgb, var(--bg) 8%, transparent)",
        }}
      />
    </div>
  );
}