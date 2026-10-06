import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { criar } from "../controllers/viagem.controller.js";
import { convidar, confirmar, remover, recusar } from "../controllers/participante.controller.js";

const router = Router();

router.post("/", autenticar, criar);
router.post("/:viagemId/participantes", autenticar, convidar);
router.patch("/:viagemId/participantes/confirmar", autenticar, confirmar);
router.patch("/:viagemId/participantes/recusar", autenticar, recusar);
router.delete("/:viagemId/participantes/:participanteId", autenticar, remover);

export default router;