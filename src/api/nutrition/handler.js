// src/api/nutrition/handler.js
const { db } = require('../../firebase');

const updateUserDataHandler = async (request, h) => {
    const { userId } = request.auth;
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
        // Menghitung BMI
        const heightInMeters = height / 100;
        const bmi = weight / (heightInMeters ** 2);
        const bmiCategory =
            bmi < 18.5 ? 'Underweight' :
            bmi < 24.9 ? 'Normal weight' :
            bmi < 29.9 ? 'Overweight' : 'Obese';

        // Rekomendasi targetWeight berdasarkan BMI
        let recommendedTargetWeight;
        if (bmi < 18.5) {
            recommendedTargetWeight = 'gain weight';
        } else if (bmi >= 18.5 && bmi < 24.9) {
            recommendedTargetWeight = 'maintain weight';
        } else {
            recommendedTargetWeight = 'loss weight';
        }

        // Validasi apakah targetWeight sesuai dengan rekomendasi
        if (targetWeight !== recommendedTargetWeight) {
            return h.response({
                status: 'fail',
                message: `Invalid targetWeight. Based on your BMI (${bmi.toFixed(1)}), the recommended target weight is "${recommendedTargetWeight}".`,
            }).code(400);
        }

        // Kalkulasi kebutuhan harian
        const dailyNeeds = calculateDailyNeeds(gender, bmiCategory, targetWeight, age, weight, height);

        // Referensi dokumen user
        const userRef = db.collection('users').doc(userId);

        // Menambahkan data ke subcollection "data"
        const dataRef = userRef.collection('data').doc();

        // Menyimpan data dalam subcollection "data"
        await dataRef.set({
            age,
            gender,
            height,
            weight,
            targetWeight,
            bmi: bmi.toFixed(1),
            category: bmiCategory,
            dailyNeeds,
            nutritionHistory: {
                totalCalories: 0,
                totalProtein: 0,
                totalCarbs: 0,
                totalFat: 0,
                totalFiber: 0,
                targetCalories: dailyNeeds.Calories,
                targetProtein: dailyNeeds.Protein,
                targetCarbs: dailyNeeds.Carbohydrates,
                targetFat: dailyNeeds.Fat,
                targetFiber: dailyNeeds.Fiber,
                remainingCalories: dailyNeeds.Calories,
                remainingProtein: dailyNeeds.Protein,
                remainingCarbs: dailyNeeds.Carbohydrates,
                remainingFat: dailyNeeds.Fat,
                remainingFiber: dailyNeeds.Fiber,
                
            },
            updatedAt: new Date(),
        });

        // Respons dengan format yang diminta
        return h.response({
            status: 'success',
            message: 'User data added successfully with BMI and daily needs calculated.',
            data: {
                bmi: parseFloat(bmi.toFixed(2)),
                category: bmiCategory,
                targetWeight,
                dailyNeeds: {
                    Calories: dailyNeeds.Calories,
                    Protein: dailyNeeds.Protein,
                    Carbohydrates: dailyNeeds.Carbohydrates,
                    Fat: dailyNeeds.Fat,
                    Fiber: dailyNeeds.Fiber
                },
                nutritionHistory: {
                    totalCalories: 0,
                    totalProtein: 0,
                    totalCarbs: 0,
                    totalFat: 0,
                    totalFiber: 0,
                    targetCalories: dailyNeeds.Calories,
                    targetProtein: dailyNeeds.Protein,
                    targetCarbs: dailyNeeds.Carbohydrates,
                    targetFat: dailyNeeds.Fat,
                    targetFiber: dailyNeeds.Fiber,
                    remainingCalories: dailyNeeds.Calories,
                    remainingProtein: dailyNeeds.Protein,
                    remainingCarbs: dailyNeeds.Carbohydrates,
                    remainingFat: dailyNeeds.Fat,
                    remainingFiber: dailyNeeds.Fiber,
                }
            }
        }).code(200);
    } catch (error) {
        console.error('Error adding user data to subcollection:', error);

        return h.response({
            status: 'error',
            message: 'An error occurred while adding data to subcollection',
        }).code(500);
    }
};

// Fungsi untuk menghitung kebutuhan harian
const calculateDailyNeeds = (gender, bmiCategory, targetWeight, age, weight, height) => {
    // Menghitung BMR menggunakan rumus Mifflin-St Jeor
    let bmr;

    if (gender === 'male') {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5; // Rumus BMR untuk pria
    } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161; // Rumus BMR untuk wanita
    }

    // Menghitung TDEE dengan faktor aktivitas (lightly active)
    const tdee = bmr * 1.375; // Faktor aktivitas untuk mahasiswa yang cukup aktif

    // Penyesuaian berdasarkan targetWeight
    let adjustmentFactor = 1.0; // Faktor penyesuaian

    if (targetWeight === 'loss weight') {
        adjustmentFactor = 0.85; // Kurangi 15% untuk penurunan berat badan
    } else if (targetWeight === 'gain weight') {
        adjustmentFactor = 1.15; // Tambah 15% untuk penambahan berat badan
    }

    // Hitung kebutuhan kalori dan makronutrien harian
    const calories = Math.round(tdee * adjustmentFactor);
    const protein = Math.round((calories * 0.15) / 4); // 15% dari kalori untuk protein
    const carbohydrates = Math.round((calories * 0.55) / 4); // 55% dari kalori untuk karbohidrat
    const fat = Math.round((calories * 0.25) / 9); // 25% dari kalori untuk lemak
    const fiber = 25; // Serat harian tetap 25g sebagai rekomendasi umum

    return {
        Calories: calories,
        Protein: protein,
        Carbohydrates: carbohydrates,
        Fat: fat,
        Fiber: fiber
    };
};



const getUserDataHandler = async (request, h) => {
    const { userId } = request.auth; // Mendapatkan userId dari JWT yang sudah tervalidasi

    try {
        // Referensi ke dokumen pengguna di Firestore
        const userRef = db.collection('users').doc(userId);
        const dataSnapshot = await userRef.collection('data')
            .orderBy('updatedAt', 'desc')
            .limit(1)
            .get();

        // Jika data pengguna tidak ditemukan
        if (dataSnapshot.empty) {
            return h.response({
                status: 'fail',
                message: 'User data not found',
            }).code(404);
        }

        // Ambil dokumen pertama (data terbaru)
        const userData = dataSnapshot.docs[0].data();

        // Respons dengan data pengguna
        return h.response({
            status: 'success',
            message: 'User data retrieved successfully',
            data: {
                age: userData.age,
                gender: userData.gender,
                height: userData.height,
                weight: userData.weight,
                targetWeight: userData.targetWeight,
                bmi: userData.bmi,
                category: userData.category,
                dailyNeeds: userData.dailyNeeds,
                nutritionHistory: userData.nutritionHistory,
            },
        }).code(200);
    } catch (error) {
        console.error('Error fetching user data:', error);

        // Respons error jika terjadi masalah
        return h.response({
            status: 'error',
            message: 'An error occurred while retrieving user data',
        }).code(500);
    }
};

const getNutritionHistoryHandler = async (request, h) => {
    const { userId } = request.auth; // Mendapatkan userId dari JWT yang sudah tervalidasi

    try {
        // Referensi ke dokumen pengguna di Firestore
        const userRef = db.collection('users').doc(userId);
        const dataSnapshot = await userRef.collection('data')
            .orderBy('updatedAt', 'desc')
            .limit(1)
            .get();

        // Jika data pengguna tidak ditemukan
        if (dataSnapshot.empty) {
            return h.response({
                status: 'fail',
                message: 'User data not found',
            }).code(404);
        }

        // Ambil dokumen pertama (data terbaru)
        const userData = dataSnapshot.docs[0].data();

        // Respons dengan data pengguna
        return h.response({
            status: 'success',
            message: 'User data retrieved successfully',
            data: {
                nutritionHistory: userData.nutritionHistory,
            },
        }).code(200);
    } catch (error) {
        console.error('Error fetching user data:', error);

        // Respons error jika terjadi masalah
        return h.response({
            status: 'error',
            message: 'An error occurred while retrieving user data',
        }).code(500);
    }
};





module.exports = { updateUserDataHandler, getUserDataHandler, getNutritionHistoryHandler };
