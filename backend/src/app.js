import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import viagemRoutes from "./routes/viagem.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/viagens", viagemRoutes);

app.get("/", (req, res) => {
  res.json({ status: "API rodando" });
});

export default app;
