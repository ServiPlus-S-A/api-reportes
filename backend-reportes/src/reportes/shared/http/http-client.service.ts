import { Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
    });
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.get<T>(url, config);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Error GET request to ${url}: ${error.message}`);
      throw error;
    }
  }

  async post<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error: any) {
      this.logger.error(`Error POST request to ${url}: ${error.message}`);
      throw error;
    }
  }
}
