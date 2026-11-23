import { Router } from "express";
import { cadastrar, login, loginComGoogle } from "../controllers/auth.controller.js";

const router = Router();

router.post("/cadastro", cadastrar);
router.post("/login", login);
router.post("/google", loginComGoogle);

export default router;