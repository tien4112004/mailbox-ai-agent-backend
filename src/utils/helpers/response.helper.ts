import { IMeta, IResponse } from '../types/response.type';

export const responseHelper = <T>(
    message: string,
    code: number,
    payload: { data?: T; errors?: unknown; context?: unknown; meta?: any },
) => {
    const response = { message, code };

    if (payload.data !== undefined) {
        Object.assign(response, { data: payload.data });
    }

    if (payload.errors !== undefined) {
        Object.assign(response, { errors: payload.errors });
    }

    if (payload.meta !== undefined) {
        Object.assign(response, { meta: payload.meta });
    }

    if (payload.context !== undefined) {
        const context = payload.context as Record<string, any>;
        Object.assign(response, {
            error_code: context.error_code,
            message: context.message,
            details: context.details,
        });
    }

    return response;
};

export const successResponse = <T>(message: string, code: number, data?: T, meta?: IMeta): IResponse<T> => {
    return responseHelper<T>(message, code, { data, meta });
};

export const errorResponse = (message: string, code: number, errors?: unknown): IResponse<void> => {
    return responseHelper(message, code, { errors });
};
export const errorResponseWithContext = (context: unknown, code: number = 400): IResponse<void> => {
    return responseHelper('Error', code, { context });
};
export function errorFields(field: string, error: any) {
    return {
        field,
        error_code: error.error_code,
        message: error.message,
        details: error.details,
    };
}

