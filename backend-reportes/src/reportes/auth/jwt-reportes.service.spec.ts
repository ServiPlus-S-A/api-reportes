import { UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { JwtReportesService } from "./jwt-reportes.service";

describe("JwtReportesService", () => {
  const originalSecret = process.env.JWT_SECRET;
  let service: JwtReportesService;

  beforeEach(() => {
    process.env.JWT_SECRET = "dev-serviplus-secret";
    service = new JwtReportesService();
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it("validates a signed token and extracts unidadIds", () => {
    const token = jwt.sign(
      {
        sub: "coord-1",
        role: "coordinador",
        unidadIds: ["reportes-centro"],
      },
      process.env.JWT_SECRET as string,
    );

    const payload = service.validateToken(`Bearer ${token}`);

    expect(payload).toEqual({
      sub: "coord-1",
      role: "coordinador",
      unidadIds: ["reportes-centro"],
    });
  });

  it("maps unidadId into unidadIds when only one unit is present", () => {
    const token = jwt.sign(
      {
        sub: "coord-1",
        role: "coordinador",
        unidadId: "reportes-centro",
      },
      process.env.JWT_SECRET as string,
    );

    const payload = service.validateToken(`Bearer ${token}`);
    expect(payload.unidadIds).toEqual(["reportes-centro"]);
  });

  it("returns empty unidadIds when token does not include unit claims", () => {
    const token = jwt.sign(
      {
        sub: "coord-1",
        role: "coordinador",
      },
      process.env.JWT_SECRET as string,
    );

    const payload = service.validateToken(`Bearer ${token}`);
    expect(payload.unidadIds).toEqual([]);
  });

  it("returns empty role when token does not include role claim", () => {
    const token = jwt.sign(
      {
        sub: "coord-1",
      },
      process.env.JWT_SECRET as string,
    );

    const payload = service.validateToken(`Bearer ${token}`);
    expect(payload.role).toBe("");
  });

  it("throws unauthorized when bearer header is missing", () => {
    expect(() => service.validateToken(undefined)).toThrow(
      UnauthorizedException,
    );
  });

  it("throws unauthorized when JWT_SECRET is not configured", () => {
    delete process.env.JWT_SECRET;

    expect(() => service.validateToken("Bearer any-token")).toThrow(
      UnauthorizedException,
    );
  });

  it("throws unauthorized when token is invalid", () => {
    expect(() => service.validateToken("Bearer invalid-token")).toThrow(
      UnauthorizedException,
    );
  });

  it("throws unauthorized when token has no subject", () => {
    const token = jwt.sign(
      {
        role: "coordinador",
      },
      process.env.JWT_SECRET as string,
    );

    expect(() => service.validateToken(`Bearer ${token}`)).toThrow(
      UnauthorizedException,
    );
  });
});
