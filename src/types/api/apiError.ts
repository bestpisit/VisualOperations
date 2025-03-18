import axios from "axios";

export enum ErrorType {
    UNAUTHORIZED = 'UNAUTHORIZED',
    NOT_FOUND = 'NOT_FOUND',
    BAD_REQUEST = 'BAD_REQUEST',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    FORBIDDEN = 'FORBIDDEN',
}

export interface ApiErrorResponse {
    error: string;
    type: ErrorType;
    statusCode: number;
}

export class ApiError extends Error {
    public type: ErrorType;
    public statusCode: number;

    constructor(type: ErrorType, message: string, statusCode: number) {
        super(message);
        this.type = type;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, ApiError.prototype);
    }

    static unauthorized(message = 'Unauthorized') {
        return new ApiError(ErrorType.UNAUTHORIZED, message, 401);
    }

    static notFound(message = 'Not Found') {
        return new ApiError(ErrorType.NOT_FOUND, message, 404);
    }

    static badRequest(message = 'Bad Request') {
        return new ApiError(ErrorType.BAD_REQUEST, message, 400);
    }

    static internalServerError(message = 'Internal Server Error') {
        return new ApiError(ErrorType.INTERNAL_SERVER_ERROR, message, 500);
    }

    static forbidden(message = 'Forbidden') {
        return new ApiError(ErrorType.FORBIDDEN, message, 403);
    }
}

export function handleApiError(error: any, defaultMessage = 'An unexpected error occurred') {
    let errorMessage = defaultMessage;

    // Axios error handling
    if (axios.isAxiosError(error)) {
        const response = error.response;
        
        if (response && response.data) {
            const apiError = response.data as ApiErrorResponse;
            
            switch (apiError.type) {
                case ErrorType.UNAUTHORIZED:
                    errorMessage = 'You are not authorized to perform this action.';
                    break;
                case ErrorType.NOT_FOUND:
                    errorMessage = 'Requested resource not found.';
                    break;
                case ErrorType.BAD_REQUEST:
                    errorMessage = apiError.error || 'Invalid input provided.';
                    break;
                case ErrorType.INTERNAL_SERVER_ERROR:
                    errorMessage = 'Something went wrong on our end.';
                    break;
                case ErrorType.FORBIDDEN:
                    errorMessage = 'You do not have permission to access this.';
                    break;
                default:
                    errorMessage = apiError.error || defaultMessage;
                    break;
            }
        } else {
            errorMessage = 'Network error. Please check your connection.';
        }
    }

    // Show toast notification
    // toast.error(errorMessage);
    return errorMessage;
}