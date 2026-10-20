import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { gerar, visualizar } from "../controllers/roteiro.controller.js";

const router = Router({ mergeParams: true });

router.get("/", autenticar, visualizar);
router.post("/gerar", autenticar, gerar);

export default router;