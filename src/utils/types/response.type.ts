export interface IResponse<T = any> {
    message: string;
    data?: T;
    errors?: unknown;
    meta?: IMeta;
}

export interface IMeta {
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
    from: number;
    to: number;
}
