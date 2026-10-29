import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import viagemRoutes from "./routes/viagem.routes.js";
import mensagemRoutes from "./routes/mensagem.routes.js";
import preferenciaRoutes from "./routes/preferencia.routes.js";
import destinoRoutes from "./routes/destino.routes.js";
import roteiroRoutes from "./routes/roteiro.routes.js";
import conviteRoutes from "./routes/convite.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/viagens", viagemRoutes);
app.use("/viagens/:viagemId/mensagens", mensagemRoutes);
app.use("/viagens/:viagemId/preferencias", preferenciaRoutes);
app.use("/viagens/:viagemId/destinos", destinoRoutes);
app.use("/viagens/:viagemId/roteiro", roteiroRoutes);
app.use("/convites", conviteRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ViajaIA API rodando" });
});

export default app;