import { InternalServerErrorException } from "@nestjs/common";

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(
        new InternalServerErrorException(
          "Tiempo de espera agotado al generar el archivo, intente nuevamente",
        ),
      );
    }, timeoutMs);

    timeoutHandle.unref?.();
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
