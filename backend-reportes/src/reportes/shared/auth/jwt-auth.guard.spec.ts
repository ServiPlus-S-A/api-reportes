import { ExecutionContext } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  it("validates bearer token and attaches payload to request", () => {
    const request = {
      headers: { authorization: "Bearer token" },
    };
    const jwtService = {
      validateToken: jest.fn().mockReturnValue({
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      }),
    };
    const guard = new JwtAuthGuard(jwtService as any);

    const result = guard.canActivate({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext);

    expect(result).toBe(true);
    expect(jwtService.validateToken).toHaveBeenCalledWith("Bearer token");
    expect(request).toHaveProperty("user", {
      sub: "coord-1",
      role: "coordinador",
      unidadIds: ["reportes-centro"],
    });
  });
});
