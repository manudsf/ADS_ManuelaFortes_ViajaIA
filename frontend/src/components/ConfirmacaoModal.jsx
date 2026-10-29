import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function ConfirmacaoModal({
  aberto,
  titulo,
  texto,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  perigoso = false,
  onConfirmar,
  onCancelar,
}) {
  useEffect(() => {
    if (!aberto) return;

    function fecharComEsc(e) {
      if (e.key === "Escape") onCancelar();
    }

    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [aberto, onCancelar]);

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancelar}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirmacao"
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-6 backdrop-blur-sm"
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full max-w-md rounded-3xl border border-line bg-card p-8 shadow-2xl"
          >
            <h2 id="titulo-confirmacao" className="font-display text-4xl leading-tight text-ink">
              {titulo}
            </h2>
            <p className="mt-3 leading-relaxed text-muted">{texto}</p>

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button
                onClick={onCancelar}
                className="rounded-full border border-line px-5 py-2.5 font-medium text-ink"
              >
                {textoCancelar}
              </button>
              <button
                onClick={onConfirmar}
                className={`rounded-full px-6 py-2.5 font-bold text-on-accent ${
                  perigoso ? "bg-accent" : "bg-turq"
                }`}
              >
                {textoConfirmar}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}