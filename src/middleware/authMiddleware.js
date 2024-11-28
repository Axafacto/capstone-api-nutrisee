//src/api/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; // Gunakan secret dari environment variables

const authMiddleware = (request, h) => {
    const authorization = request.headers.authorization;

    // Cek apakah header Authorization ada
    if (!authorization) {
        return h.response({
            status: 'fail',
            message: 'Missing Authorization header',
        }).code(401).takeover();
    }

    const token = authorization.split(' ')[1]; // Format: "Bearer <token>"
    
    try {
        // Verifikasi token JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        request.auth = { userId: decoded.userId }; // Tambahkan data user ke request
        return h.continue; // Lanjut ke handler
    } catch (error) {
        return h.response({
            status: 'fail',
            message: 'Invalid or expired token',
        }).code(401).takeover();
    }
};

module.exports = authMiddleware;
