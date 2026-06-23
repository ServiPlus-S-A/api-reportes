import { GlobalExceptionFilter } from "./global-exception.filter";
import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";

describe("GlobalExceptionFilter", () => {
  let globalFilter: GlobalExceptionFilter;

  beforeEach(() => {
    globalFilter = new GlobalExceptionFilter();
  });

  it("should catch and format HttpExceptions correctly", () => {
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockResponse = { status: mockStatus };
    const mockRequest = { url: "/test", method: "GET" };

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    const exception = new HttpException(
      "Bad Request Error",
      HttpStatus.BAD_REQUEST,
    );

    globalFilter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        path: "/test",
        message: "Bad Request Error",
      }),
    );
  });
});
