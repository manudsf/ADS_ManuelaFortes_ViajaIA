import { useEffect, useRef, useState } from "react";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const URL_SCRIPT = "https://accounts.google.com/gsi/client";

// Botão oficial "Continuar com o Google" (Google Identity Services).
// Não aparece se VITE_GOOGLE_CLIENT_ID não estiver definido.
export default function BotaoGoogle({ aoReceberCredencial }) {
  const ref = useRef(null);
  const callbackRef = useRef(aoReceberCredencial);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    callbackRef.current = aoReceberCredencial;
  });

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelado = false;

    function iniciar() {
      if (cancelado || !ref.current || !window.google?.accounts?.id) return;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resposta) => callbackRef.current?.(resposta.credential),
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        width: 340,
        locale: "pt-BR",
      });
      setPronto(true);
    }

    if (window.google?.accounts?.id) {
      iniciar();
      return () => {
        cancelado = true;
      };
    }

    let script = document.querySelector(`script[src="${URL_SCRIPT}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = URL_SCRIPT;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", iniciar);

    return () => {
      cancelado = true;
      script.removeEventListener("load", iniciar);
    };
  }, []);

  if (!CLIENT_ID) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={ref} className="flex min-h-[44px] w-full justify-center" />
      {!pronto && <p className="text-xs text-muted">Carregando login com Google...</p>}
    </div>
  );
}
