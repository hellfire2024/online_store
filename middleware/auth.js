import jwt from "jsonwebtoken";
export function getAuthUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || "dev-secret";
    try {
        const decoded = jwt.verify(token, secret);
        if (!decoded?.id || !decoded?.type) {
            return null;
        }
        return {
            id: decoded.id,
            email: decoded.email,
            type: decoded.type,
            role: decoded.role,
            permissions: decoded.permissions,
        };
    }
    catch (_error) {
        return null;
    }
}
export function requireAuth(req, res, next) {
    const user = getAuthUser(req);
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    req.authUser = user;
    return next();
}
export function requireCustomer(req, res, next) {
    const user = getAuthUser(req);
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (user.type !== "customer") {
        return res.status(403).json({ error: "Forbidden" });
    }
    req.authUser = user;
    return next();
}
export function requireAdmin(req, res, next) {
    const user = getAuthUser(req);
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (user.type !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
    }
    req.authUser = user;
    return next();
}
//# sourceMappingURL=auth.js.map