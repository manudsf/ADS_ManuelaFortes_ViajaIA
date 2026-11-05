import { useState } from "react";
import { Outlet } from "react-router-dom";
import MenuApp from "./MenuApp.jsx";

export default function LayoutPrivado() {
  const [menuAberto, setMenuAberto] = useState(true);

  return (
    <div className="min-h-screen bg-bg">
      <MenuApp aberto={menuAberto} onAlternar={() => setMenuAberto((v) => !v)} />
      <div className={`pb-24 transition-all duration-300 md:pb-0 ${menuAberto ? "md:pl-60" : "md:pl-20"}`}>
        <Outlet />
      </div>
    </div>
  );
}