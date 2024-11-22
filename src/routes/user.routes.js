import { Router } from "express";
import {
  LoginUser,
  RefreshAccessTocken,
  logOutUser,
  registerUser,
} from "../controller/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { jwtAuth } from "../middlewares/auth.middleware.js";
const router = Router();
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxcount: 1,
    },
    {
      name: "coverImage",
      maxcount: 2,
    },
  ]),
  registerUser
);

router.route("/login").post(LoginUser);
router.route("/logout").post(jwtAuth, logOutUser);
router.route("/refresh-tocken").post(RefreshAccessTocken);
export default router;
