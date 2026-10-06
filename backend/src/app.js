import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import viagemRoutes from "./routes/viagem.routes.js";
import mensagemRoutes from "./routes/mensagem.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/viagens", viagemRoutes);
app.use("/viagens/:viagemId/mensagens", mensagemRoutes);

app.get("/", (req, res) => {
  res.json({ status: "ViajaIA API rodando" });
});

export default app;