// src/api/nutrition/handler.js
const { db } = require('../../firebase');

const updateUserDataHandler = async (request, h) => {
    const { userId } = request.auth; // Mendapatkan userId dari JWT yang sudah tervalidasi
    const { age, gender, height, weight, targetWeight } = request.payload;

    // Validasi input
    if (!age || !gender || !height || !weight || !targetWeight) {
        return h.response({
            status: 'fail',
            message: 'All fields are required!',
        }).code(400);
    }

    // Validasi targetWeight
    const validTargetWeights = ['loss weight', 'maintain weight', 'gain weight'];
    if (!validTargetWeights.includes(targetWeight)) {
        return h.response({
            status: 'fail',
            message: 'Invalid targetWeight. Allowed values are: loss weight, maintain weight, gain weight.',
        }).code(400);
    }

    try {
        // Referensi dokumen user berdasarkan userId dari JWT
        const userRef = db.collection('users').doc(userId);

        // Menambahkan data ke subcollection "data" di dalam dokumen user
        const dataRef = userRef.collection('data').doc(); // Menggunakan auto-generated ID untuk subcollection
        
        // Menyimpan data dalam subcollection "data"
        await dataRef.set({
            age,
            gender,
            height,
            weight,
            targetWeight,
            updatedAt: new Date(), // Menambahkan waktu update untuk tracking
        });

        // Respons jika pembaruan berhasil
        return h.response({
            status: 'success',
            message: 'User data added to subcollection successfully',
        }).code(200);
    } catch (error) {
        // Log error jika ada masalah
        console.error('Error adding user data to subcollection:', error);

        // Respons error jika terjadi masalah
        return h.response({
            status: 'error',
            message: 'An error occurred while adding data to subcollection',
        }).code(500);
    }
};

module.exports = { updateUserDataHandler };
