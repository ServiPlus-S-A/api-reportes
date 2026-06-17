import { InternalServerErrorException } from "@nestjs/common";

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new InternalServerErrorException(
          "Tiempo de espera agotado al generar el archivo, intente nuevamente",
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}
