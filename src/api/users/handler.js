const { db } = require('../../firebase');
const bcrypt = require('bcrypt'); // Untuk hashing password
const jwt = require('jsonwebtoken'); // Untuk JWT
require('dotenv').config(); // Pastikan ini ada di bagian atas file

const JWT_SECRET = process.env.JWT_SECRET; // Ambil JWT_SECRET dari file .env




// Handler untuk registrasi
const registerHandler = async (request, h) => {
    const { username, email, password } = request.payload;

    // Validasi input
    if (!username || !email || !password) {
        return h.response({ message: 'Username, email, and password are required!' }).code(400);
    }

    try {
        // Hash password sebelum menyimpan ke database
        const hashedPassword = await bcrypt.hash(password, 10);

        // Simpan ke Firestore
        const userRef = db.collection('users').doc(); // ID unik otomatis
        await userRef.set({
            username,
            email,
            password: hashedPassword,
        });

        return h.response({ message: 'User registered successfully' }).code(201);
    } catch (error) {
        console.error('Error registering user:', error);
        return h.response({ message: 'Error registering user' }).code(500);
    }
};

// Handler untuk login
const loginHandler = async (request, h) => {
    const { email, password } = request.payload;

    if (!email || !password) {
        return h.response({ message: 'Email and password are required!' }).code(400);
    }

    try {
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('email', '==', email).get();

        if (querySnapshot.empty) {
            return h.response({ message: 'User not found' }).code(404);
        }

        const user = querySnapshot.docs[0].data();
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return h.response({ message: 'Invalid email or password' }).code(401);
        }

        const token = jwt.sign(
            { email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Cek token dan response di log
        console.log("Generated Token:", token);

        return h.response({
            message: 'Login successful',
            token: token,  // Pastikan token dikirimkan dalam response
        }).code(200);
    } catch (error) {
        console.error('Error logging in:', error.message);
        return h.response({ message: 'Error logging in', error: error.message }).code(500);
    }
};


module.exports = { registerHandler, loginHandler };
