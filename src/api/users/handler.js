const { db } = require('../../firebase');
const bcrypt = require('bcrypt'); // Untuk hashing password
const jwt = require('jsonwebtoken'); // Untuk JWT
require('dotenv').config(); // Pastikan ini ada di bagian atas file

const JWT_SECRET = process.env.JWT_SECRET; // Ambil JWT_SECRET dari file .env




//register handler
const registerHandler = async (request, h) => {
    const { username, email, password } = request.payload;

    // Validasi input
    if (!username || !email || !password) {
        return h.response({
            status: 'fail',
            message: 'Username, email, and password are required!',
        }).code(400);
    }

    try {
        // Hash password sebelum menyimpan ke database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Buat dokumen baru dengan ID otomatis
        const userRef = db.collection('users').doc();
        const userId = userRef.id;

        // Simpan data pengguna ke koleksi `users`
        await userRef.set({
            username,
            email,
            password: hashedPassword, // Password di-hash untuk keamanan
        });

        // Kirim respons sukses
        return h.response({
            status: 'success',
            message: 'User registered successfully',
            userId, // Sertakan userId untuk referensi di client
        }).code(201);
    } catch (error) {
        console.error('Error registering user:', error);
        return h.response({
            status: 'error',
            message: 'Error registering user',
        }).code(500);
    }
};



// Handler untuk login
const loginHandler = async (request, h) => {
    const { email, password } = request.payload;

    if (!email || !password) {
        return h.response({
            status: 'fail',
            message: 'Email and password are required!',
        }).code(400);
    }

    try {
        // Cari user berdasarkan email
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('email', '==', email).get();

        // Jika user tidak ditemukan
        if (querySnapshot.empty) {
            return h.response({
                status: 'fail',
                message: 'User not found',
            }).code(404);
        }

        const userDoc = querySnapshot.docs[0]; // Ambil dokumen user
        const user = userDoc.data();
        const userId = userDoc.id; // Dapatkan ID user

        // Validasi password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return h.response({
                status: 'fail',
                message: 'Invalid email or password',
            }).code(401);
        }

        // Buat token JWT
        const token = jwt.sign(
            { userId, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' } // Token berlaku selama 1 jam
        );

        // Respons sukses
        return h.response({
            status: 'success',
            message: 'Login successful',
            data: {
                token, // Kirimkan token untuk digunakan client
            },
        }).code(200);
    } catch (error) {
        console.error('Error logging in:', error.message);
        return h.response({
            status: 'error',
            message: 'An error occurred while logging in',
        }).code(500);
    }
};

const getUserByIdHandler = async (request, h) => {
    const { id } = request.params; // Ambil ID dari parameter URL

    try {
        // Ambil data user berdasarkan ID dokumen
        const userRef = db.collection('users').doc(id);
        const userDoc = await userRef.get();

        // Jika user tidak ditemukan
        if (!userDoc.exists) {
            return h.response({
                status: 'fail',
                message: `User with ID ${id} not found`,
            }).code(404);
        }

        // Ambil data user dari dokumen
        const userData = userDoc.data();

        // Kembalikan data user
        return h.response({
            status: 'success',
            message: 'User retrieved successfully',
            data: {
                id, // Sertakan ID user
                ...userData, // Data user lainnya (username, email, dll.)
            },
        }).code(200);
    } catch (error) {
        console.error('Error retrieving user by ID:', error.message);
        return h.response({
            status: 'error',
            message: 'An error occurred while retrieving user',
        }).code(500);
    }
};




module.exports = { registerHandler, loginHandler, getUserByIdHandler};
