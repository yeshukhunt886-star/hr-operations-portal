import crypto from "node:crypto";

export function generateShareToken() {
    return crypto.randomBytes(32).toString("hex");
}

export function hashShareToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}