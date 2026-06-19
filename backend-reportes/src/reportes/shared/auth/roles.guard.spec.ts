import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  const createContext = (role: string) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            sub: "user-1",
            role,
            unidadIds: ["reportes-centro"],
          },
        }),
      }),
    }) as unknown as ExecutionContext;

  const createContextWithoutUser = () =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    }) as unknown as ExecutionContext;

  it("allows normalized coordinator role", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["coordinador"]),
    };
    const guard = new RolesGuard(reflector as any);

    expect(guard.canActivate(createContext("Coordinador"))).toBe(true);
  });

  it("allows request when route has no role metadata", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = new RolesGuard(reflector as any);

    expect(guard.canActivate(createContext("tecnico"))).toBe(true);
  });

  it("allows administrative direction role with accents and spaces", () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue(["direccion_administrativa"]),
    };
    const guard = new RolesGuard(reflector as any);

    expect(guard.canActivate(createContext("Dirección Administrativa"))).toBe(
      true,
    );
  });

  it("blocks roles outside the allowed list", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["coordinador"]),
    };
    const guard = new RolesGuard(reflector as any);

    expect(() => guard.canActivate(createContext("tecnico"))).toThrow(
      ForbiddenException,
    );
  });

  it("blocks requests without authenticated user when roles are required", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["coordinador"]),
    };
    const guard = new RolesGuard(reflector as any);

    expect(() => guard.canActivate(createContextWithoutUser())).toThrow(
      ForbiddenException,
    );
  });
});
