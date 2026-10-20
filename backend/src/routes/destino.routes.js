import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { listar, sugerir, votar, encerrar } from "../controllers/destino.controller.js";

const router = Router({ mergeParams: true });

router.get("/", autenticar, listar);
router.post("/sugerir", autenticar, sugerir);
router.post("/encerrar-votacao", autenticar, encerrar);
router.post("/:destinoId/votar", autenticar, votar);

export default router;