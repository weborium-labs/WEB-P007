import { describe, expect, it } from "vitest";
import request from "supertest";

import { app } from "../src/app.js";

describe("Health API", () => {
  it("should return 200 when the API is running", async () => {
    const response = await request(app).get("/api/v1/health").expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "WEB-P007 IMS API is running",
      data: {
        service: "backend",
        status: "healthy",
      },
    });

    expect(response.body.data.timestamp).toBeDefined();
  });

  it("should return 404 for an unknown route", async () => {
    const response = await request(app).get("/api/v1/unknown").expect(404);

    expect(response.body).toMatchObject({
      success: false,
      message: "Route not found",
    });
  });
});
