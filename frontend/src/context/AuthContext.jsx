import { createContext, useContext, useState } from "react";
import { api, salvarSessao, limparSessao, lerUsuarioSalvo } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(lerUsuarioSalvo);

  async function entrar(email, senha) {
    const { token, usuario: dados } = await api.login({ email, senha });
    salvarSessao(token, dados);
    setUsuario(dados);
  }

  function sair() {
    limparSessao();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, autenticado: Boolean(usuario), entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}