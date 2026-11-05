import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { aplicarTema, lerTemaSalvo } from "./utils/tema.js";

aplicarTema(lerTemaSalvo());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);