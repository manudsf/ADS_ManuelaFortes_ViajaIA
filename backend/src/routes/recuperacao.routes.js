import { Router } from "express";
import { esqueci, redefinir } from "../controllers/recuperacao.controller.js";

const router = Router();

router.post("/esqueci-senha", esqueci);
router.post("/redefinir-senha", redefinir);

export default router;