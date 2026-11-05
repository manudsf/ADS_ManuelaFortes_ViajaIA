import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { listar, criar, editar, excluir, saldos, historico } from "../controllers/despesa.controller.js";

const router = Router({ mergeParams: true });

router.get("/", autenticar, listar);
router.post("/", autenticar, criar);
router.get("/saldos", autenticar, saldos);
router.get("/:despesaId/historico", autenticar, historico);
router.patch("/:despesaId", autenticar, editar);
router.delete("/:despesaId", autenticar, excluir);

export default router;