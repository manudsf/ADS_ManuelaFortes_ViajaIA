import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { gerar, revogar, publico, aceitar } from "../controllers/convite.controller.js";

const router = Router();

router.post("/viagem/:viagemId", autenticar, gerar);
router.delete("/viagem/:viagemId", autenticar, revogar);
router.get("/:token", publico);
router.post("/:token/aceitar", autenticar, aceitar);

export default router;