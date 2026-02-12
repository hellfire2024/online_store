import { Request, Response, NextFunction } from "express";
export interface AuthUser {
    id: string;
    email?: string;
    type: "admin" | "customer";
    role?: string;
    permissions?: string[];
}
export interface AuthenticatedRequest extends Request {
    authUser?: AuthUser;
}
export declare function getAuthUser(req: Request): AuthUser | null;
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function requireCustomer(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map