import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { buscar, gerar, editar, status, lembrar } from "../controllers/preferencia.controller.js";

const router = Router({ mergeParams: true });

router.get("/", autenticar, buscar);
router.get("/status", autenticar, status);
router.post("/gerar", autenticar, gerar);
router.post("/lembrar", autenticar, lembrar);
router.patch("/", autenticar, editar);

export default router;