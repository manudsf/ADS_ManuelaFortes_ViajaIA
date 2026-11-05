import { Router } from "express";
import { autenticar } from "../middlewares/auth.middleware.js";
import { buscar, atualizar, senha } from "../controllers/perfil.controller.js";

const router = Router();

router.get("/", autenticar, buscar);
router.patch("/", autenticar, atualizar);
router.patch("/senha", autenticar, senha);

export default router;