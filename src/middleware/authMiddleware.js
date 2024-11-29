// src/api/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; // Mendapatkan secret dari environment variables

// Middleware untuk memvalidasi JWT
const validateToken = async (request, h) => {
    const authorization = request.headers.authorization;

    // Cek apakah header Authorization ada dan sesuai format
    if (!authorization || !authorization.startsWith('Bearer ')) {
        return h.response({
            status: 'fail',
            message: 'Authorization header must be in the format: Bearer <token>',
        }).code(401).takeover();
    }

    // Ekstrak token dari header
    const token = authorization.split(' ')[1];

    try {
        // Verifikasi token menggunakan JWT_SECRET
        const decoded = jwt.verify(token, JWT_SECRET);

        // Simpan informasi userId di objek request untuk digunakan di handler berikutnya
        request.auth = { userId: decoded.userId };

        // Lanjutkan request
        return h.continue;
    } catch (error) {
        // Log error untuk debugging
        console.error('JWT validation error:', error);

        // Tangani token yang tidak valid
        return h.response({
            status: 'fail',
            message: 'Invalid or expired token',
        }).code(401).takeover();
    }
};

module.exports = { validateToken };
