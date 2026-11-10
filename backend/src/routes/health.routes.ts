import { Request, Response, Router, type Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();

router.get("/", (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: "WEB-P007 IMS API is running",
    data: {
      service: "backend",
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
