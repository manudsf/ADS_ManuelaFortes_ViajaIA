import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { listar, enviar, concluir } from "../controllers/mensagem.controller.js";

const router = Router({ mergeParams: true });

router.get("/", autenticar, listar);
router.post("/", autenticar, enviar);
router.post("/concluir", autenticar, concluir);

export default router;