// src/api/nutrition/handler.js
const { db } = require('../../firebase');
const addUserDataHandler = async (request, h) => {
    const { age, gender, height, weight, targetWeight } = request.payload;
    const { userId } = request.auth; // Ambil userId dari token

    if (!age || !gender || !height || !weight || !targetWeight) {
        return h.response({
            status: 'fail',
            message: 'All fields are required!',
        }).code(400);
    }

    try {
        // Ambil referensi user dengan ID dari token
        const userRef = db.collection('users').doc(userId);

        // Periksa apakah dokumen user ada
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return h.response({
                status: 'fail',
                message: 'User not found',
            }).code(404);
        }

        // Simpan data ke subcollection 'data' di user
        const dataRef = userRef.collection('data').doc(); // Menambahkan data baru dengan ID otomatis
        await dataRef.set({
            age,
            gender,
            height,
            weight,
            targetWeight,
        });

        return h.response({
            status: 'success',
            message: 'User data added successfully',
        }).code(200);
    } catch (error) {
        console.error('Error adding user data:', error);
        return h.response({
            status: 'error',
            message: 'An error occurred while adding user data',
        }).code(500);
    }
};

module.exports = { addUserDataHandler};




/* const calculateBmiHandler = async (request, h) => {
    const { gender, age, height, weight } = request.payload;

    if (!gender || !age || !height || !weight) {
        return h.response({
            status: 'fail',
            message: 'Gender, age, height, and weight are required!',
        }).code(400);
    }

    try {
        const token = request.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId; // Ambil userId dari token

        const bmi = weight / (height * height); // Rumus BMI
        const { protein, fat, carbs } = calculateNutrition(bmi);

        // Simpan ke subcollection `profile/bmi`
        const bmiRef = db.collection('users').doc(userId).collection('profile').doc('bmi');
        await bmiRef.set({
            gender,
            age,
            height,
            weight,
            bmi,
            protein,
            fat,
            carbs,
        });

        return h.response({
            status: 'success',
            message: 'BMI and nutrition calculated successfully',
            data: { bmi, protein, fat, carbs },
        }).code(200);
    } catch (error) {
        console.error('Error calculating BMI:', error);
        return h.response({
            status: 'error',
            message: 'Unable to calculate BMI',
        }).code(500);
    }
};

module.exports = { calculateBmiHandler }; */
