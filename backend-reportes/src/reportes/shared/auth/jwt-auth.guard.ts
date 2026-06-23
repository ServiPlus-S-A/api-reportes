import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtReportesService } from "./jwt-reportes.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtReportesService: JwtReportesService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    request.user = this.jwtReportesService.validateToken(
      request.headers.authorization,
    );
    return true;
  }
}
