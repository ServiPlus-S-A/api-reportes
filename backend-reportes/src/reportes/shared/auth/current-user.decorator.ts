import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayloadData } from "../../shared/interfaces/detalle-solicitud.interface";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayloadData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
