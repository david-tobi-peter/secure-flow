import type { Response } from "express";
import type { Pagination } from "@/types/index.js";

/** Centralized success responses; wraps payloads in the APIResponse envelope. */
export class ApiResponse {
  /**
   * Write a success envelope to the client.
   *
   * @param res
   * @param status
   * @param summary
   * @param data
   */
  static send<T>(res: Response, status: number, summary: string, data?: T): void {
    const requestId = (res.locals.requestId as string | undefined) ?? null;
    res.status(status).json({
      status,
      summary,
      ...(requestId && { requestId }),
      ...(data !== undefined && { data }),
    });
  }

  /**
   * Write a paginated success envelope to the client.
   *
   * @param res
   * @param status
   * @param summary
   * @param data
   * @param page
   * @param perPage
   * @param total
   */
  static sendPaginated<T>(
    res: Response,
    status: number,
    summary: string,
    data: T[],
    page: number,
    perPage: number,
    total: number,
  ): void {
    const totalPages = Math.ceil(total / perPage);
    const pagination: Pagination = {
      page,
      perPage,
      total,
      totalPages,
      next: page < totalPages ? page + 1 : null,
      prev: page > 1 ? page - 1 : null,
    };
    const requestId = (res.locals.requestId as string | undefined) ?? null;
    res.status(status).json({
      status,
      summary,
      ...(requestId && { requestId }),
      data,
      ...pagination,
    });
  }
}
