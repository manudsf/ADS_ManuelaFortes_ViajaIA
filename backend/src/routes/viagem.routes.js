import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { criar, excluir, buscar } from "../controllers/viagem.controller.js";
import { convidar, confirmar, remover, recusar } from "../controllers/participante.controller.js";

const router = Router();

router.post("/", autenticar, criar);
router.get("/:viagemId", autenticar, buscar);
router.delete("/:viagemId", autenticar, excluir);
router.post("/:viagemId/participantes", autenticar, convidar);
router.patch("/:viagemId/participantes/confirmar", autenticar, confirmar);
router.patch("/:viagemId/participantes/recusar", autenticar, recusar);
router.delete("/:viagemId/participantes/:participanteId", autenticar, remover);

export default router;