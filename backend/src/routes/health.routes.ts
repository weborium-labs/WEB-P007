import { Request, Response, Router, type Router as ExpressRouter } from "express";
import { ApiResponse } from "../utils/ApiResponse.js";

const router: ExpressRouter = Router();

router.get("/", (_req: Request, res: Response) => {
  return res.status(200).json(new ApiResponse(200, {
    timestamp: new Date().toISOString()
  }, 'IMS Service is healthy!'));
});

export default router;
