import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Entrar from "./pages/Entrar.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Viagens from "./pages/Viagens.jsx";
import NovaViagem from "./pages/NovaViagem.jsx";
import DetalheViagem from "./pages/DetalheViagem.jsx";
import ChatAgente from "./pages/ChatAgente.jsx";
import VotacaoDestinos from "./pages/VotacaoDestinos.jsx";
import RoteiroViagem from "./pages/RoteiroViagem.jsx";
import DespesasViagem from "./pages/DespesasViagem.jsx";
import ConvitePublico from "./pages/ConvitePublico.jsx";
import Perfil from "./pages/Perfil.jsx";
import LayoutPrivado from "./components/LayoutPrivado.jsx";
import BotaoTema from "./components/BotaoTema.jsx";

function RotaPrivada({ children }) {
  const { autenticado } = useAuth();
  return autenticado ? children : <Navigate to="/entrar" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <BotaoTema />
        <Routes>
          <Route path="/" element={<Navigate to="/entrar" replace />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/convite/:token" element={<ConvitePublico />} />

          <Route
            element={
              <RotaPrivada>
                <LayoutPrivado />
              </RotaPrivada>
            }
          >
            <Route path="/viagens" element={<Viagens />} />
            <Route path="/viagens/nova" element={<NovaViagem />} />
            <Route path="/viagens/:id" element={<DetalheViagem />} />
            <Route path="/viagens/:id/chat" element={<ChatAgente />} />
            <Route path="/viagens/:id/destinos" element={<VotacaoDestinos />} />
            <Route path="/viagens/:id/roteiro" element={<RoteiroViagem />} />
            <Route path="/viagens/:id/despesas" element={<DespesasViagem />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}