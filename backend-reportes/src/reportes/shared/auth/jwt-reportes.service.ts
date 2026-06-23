import { Injectable, UnauthorizedException } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { JwtPayloadData } from "../../shared/interfaces/detalle-solicitud.interface";

@Injectable()
export class JwtReportesService {
  validateToken(authorization?: string): JwtPayloadData {
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token JWT requerido.");
    }

    const token = authorization.replace("Bearer ", "").trim();
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new UnauthorizedException("JWT_SECRET no configurado.");
    }

    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      if (!payload.sub) {
        throw new UnauthorizedException("Token JWT sin usuario.");
      }

      const unidadIds = Array.isArray(payload.unidadIds)
        ? payload.unidadIds.map(String)
        : payload.unidadId
          ? [String(payload.unidadId)]
          : [];

      return {
        sub: String(payload.sub ?? ""),
        role: String(payload.role ?? ""),
        unidadIds,
      };
    } catch {
      throw new UnauthorizedException("Token JWT invalido o expirado.");
    }
  }
}
