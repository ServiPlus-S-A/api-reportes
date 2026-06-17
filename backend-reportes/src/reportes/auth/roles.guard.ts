import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtPayloadData } from "../interfaces/detalle-solicitud.interface";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayloadData | undefined;
    const userRole = this.normalizeRole(user?.role ?? "");
    const allowedRoles = roles.map((role) => this.normalizeRole(role));

    if (allowedRoles.includes(userRole)) {
      return true;
    }

    throw new ForbiddenException(
      "Permisos insuficientes para visualizar este informe de costos",
    );
  }

  private normalizeRole(role: string): string {
    return role
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }
}
