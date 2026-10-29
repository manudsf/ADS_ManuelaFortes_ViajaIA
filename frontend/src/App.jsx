import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Entrar from "./pages/Entrar.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Viagens from "./pages/Viagens.jsx";
import NovaViagem from "./pages/NovaViagem.jsx";
import DetalheViagem from "./pages/DetalheViagem.jsx";
import ChatAgente from "./pages/ChatAgente.jsx";

function RotaPrivada({ children }) {
  const { autenticado } = useAuth();
  return autenticado ? children : <Navigate to="/entrar" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/entrar" replace />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route
            path="/viagens"
            element={
              <RotaPrivada>
                <Viagens />
              </RotaPrivada>
            }
          />
          <Route
            path="/viagens/nova"
            element={
              <RotaPrivada>
                <NovaViagem />
              </RotaPrivada>
            }
          />
          <Route
            path="/viagens/:id"
            element={
              <RotaPrivada>
                <DetalheViagem />
              </RotaPrivada>
            }
          />
          <Route
            path="/viagens/:id/chat"
            element={
              <RotaPrivada>
                <ChatAgente />
              </RotaPrivada>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}