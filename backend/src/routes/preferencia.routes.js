import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { buscar, gerar, editar } from "../controllers/preferencia.controller.js";

const router = Router({ mergeParams: true });

router.get("/", autenticar, buscar);
router.post("/gerar", autenticar, gerar);
router.patch("/", autenticar, editar);

export default router;