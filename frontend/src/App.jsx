import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Entrar from "./pages/Entrar.jsx";
import Cadastro from "./pages/Cadastro.jsx";
import Viagens from "./pages/Viagens.jsx";
import NovaViagem from "./pages/NovaViagem.jsx";

function RotaPrivada({ children }) {
  const { autenticado } = useAuth();
  return autenticado ? children : <Navigate to="/entrar" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<p className="p-10">Landing (próximo passo)</p>} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route
  path="/viagens/nova"
  element={
    <RotaPrivada>
      <NovaViagem />
    </RotaPrivada>
  }
/>
<Route path="/viagens/:id" element={<RotaPrivada><p className="p-10 text-ink">Detalhe da viagem: próximo passo.</p></RotaPrivada>} />
          <Route
            path="/viagens"
            element={
              <RotaPrivada>
                <Viagens />
              </RotaPrivada>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}