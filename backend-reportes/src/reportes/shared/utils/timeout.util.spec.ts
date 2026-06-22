import { InternalServerErrorException } from "@nestjs/common";
import { withTimeout } from "./timeout.util";

describe("timeout.util", () => {
  describe("withTimeout", () => {
    it("should resolve successfully if promise completes before timeout", async () => {
      const promise = Promise.resolve("success");
      const result = await withTimeout(promise, 1000);
      expect(result).toBe("success");
    });

    it("should reject with timeout error if promise takes too long", async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve("late"), 3000);
      });

      await expect(withTimeout(promise, 100)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it("should reject with correct timeout message", async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve("late"), 3000);
      });

      try {
        await withTimeout(promise, 100);
        fail("Should have thrown");
      } catch (error) {
        expect(error.message).toContain("Tiempo de espera agotado");
      }
    });

    it("should handle rejected promises before timeout", async () => {
      const promise = Promise.reject(new Error("Test error"));
      await expect(withTimeout(promise, 1000)).rejects.toThrow("Test error");
    });

    it("should work with different timeout values", async () => {
      const promise = Promise.resolve(42);
      const result = await withTimeout(promise, 5000);
      expect(result).toBe(42);
    });

    it("should timeout immediately for 0ms timeout", async () => {
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve("done"), 1000);
      });

      await expect(withTimeout(promise, 0)).rejects.toThrow();
    });
  });
});
