import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export class ExportQueryDto {
  @ApiProperty({ enum: ["pdf", "excel"], example: "pdf" })
  @IsEnum(["pdf", "excel"])
  formato: "pdf" | "excel";
}
