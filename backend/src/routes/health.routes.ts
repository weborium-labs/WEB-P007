import { Request, Response, Router, type Router as ExpressRouter } from "express";
import { ApiResponse } from "../utils/ApiResponse.js";
import { emailService } from "../services/email.service.js";

const router: ExpressRouter = Router();

router.get("/", (_req: Request, res: Response) => {
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        service: "backend",
        status: "healthy",
        timestamp: new Date().toISOString(),
      },
      "WEB-P007 IMS API is running",
    ),
  );
});

router.get("/email-test", async (_req: Request, res: Response) => {
  await emailService.sendEmail(
    "viralvaghela2641@gmail.com",
    "Welcome to Weborium Labs IMS",
    `
        <h2>Welcome!</h2>
        <p>Your IMS account is ready.</p>
    `,
  );
  return res.status(200).json(new ApiResponse(200, '', 'email sent to : v2641@gmail.com'))
})

export default router;
