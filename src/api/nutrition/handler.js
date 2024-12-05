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
        const dailyNeeds = calculateDailyNeeds(gender, bmiCategory, targetWeight);

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
const calculateDailyNeeds = (gender, bmiCategory, targetWeight) => {
    // Default nilai dasar kebutuhan harian
    const baseCalories = gender === 'male' ? 2500 : 2000;
    const baseProtein = gender === 'male' ? 75 : 66;
    const baseCarbohydrates = 150;
    const baseFat = 50;
    const baseFiber = 8;

    let adjustmentFactor = 1.0; // Faktor penyesuaian

    // Penyesuaian berdasarkan kategori BMI dan targetWeight
    if (targetWeight === 'loss weight') {
        adjustmentFactor = 0.85; // Kurangi 15%
    } else if (targetWeight === 'gain weight') {
        adjustmentFactor = 1.15; // Tambah 15%
    }

    // Hitung kebutuhan harian dengan penyesuaian
    return {
        Calories: Math.round(baseCalories * adjustmentFactor),
        Protein: Math.round(baseProtein * adjustmentFactor),
        Carbohydrates: Math.round(baseCarbohydrates * adjustmentFactor),
        Fat: Math.round(baseFat * adjustmentFactor),
        Fiber: Math.round(baseFiber * adjustmentFactor),
    };
};


const getUserDataHandler = async (request, h) => {
    const { userId } = request.auth; // Mendapatkan userId dari JWT yang sudah tervalidasi

    console.log('User ID from token:', userId);  // Verifikasi ID yang diterima dari token

    try {
        // Referensi ke koleksi 'data' pengguna
        const dataRef = db.collection('users').doc(userId).collection('data');

        // Ambil dokumen data terbaru, misalnya yang terakhir diperbarui
        const dataSnapshot = await dataRef.orderBy('updatedAt', 'desc').limit(1).get();

        if (dataSnapshot.empty) {
            return h.response({
                status: 'fail',
                message: 'User data not found',
            }).code(404);
        }

        // Ambil dokumen pertama (dokumen data terbaru)
        const userDoc = dataSnapshot.docs[0];

        const userData = userDoc.data(); // Mengambil data dari dokumen 'data'

        // Periksa jika dailyNeeds ada dan merupakan objek map
        if (!userData.dailyNeeds || typeof userData.dailyNeeds !== 'object') {
            return h.response({
                status: 'fail',
                message: 'No valid daily needs data found for the user',
            }).code(404);
        }

        // Ambil riwayat makanan dari koleksi 'nutritionHistory'
        const nutritionHistoryRef = dataRef.doc(userDoc.id).collection('nutritionHistory');
        const nutritionHistorySnapshot = await nutritionHistoryRef.where('date', '==', new Date().toISOString().split('T')[0]).get();

        // Menghitung total kalori dan nutrisi lainnya dari history
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;

        nutritionHistorySnapshot.forEach(doc => {
            const nutritionData = doc.data().nutrition;
            totalCalories += nutritionData['Calories (kcal)'] || 0;
            totalProtein += nutritionData['Protein (g)'] || 0;
            totalCarbs += nutritionData['Carbohydrates (g)'] || 0;
            totalFat += nutritionData['Fat (g)'] || 0;
        });

        // Menyiapkan response dengan data lengkap pengguna dan dailyNeeds
        const response = {
            status: 'success',
            message: 'User data and daily needs fetched successfully',
            data: {
                dailyNeeds: userData.dailyNeeds,  // Menampilkan data dailyNeeds
                nutritionHistory: {
                    totalCalories,
                    totalProtein,
                    totalCarbs,
                    totalFat,
                    targetCalories: userData.dailyNeeds.Calories,
                    targetProtein: userData.dailyNeeds.Protein,
                    targetCarbs: userData.dailyNeeds.Carbohydrates,
                    targetFat: userData.dailyNeeds.Fat,
                    // Anda bisa menambahkan perhitungan untuk sisa kalori dan nutrisi
                    remainingCalories: userData.dailyNeeds.Calories - totalCalories,
                    remainingProtein: userData.dailyNeeds.Protein - totalProtein,
                    remainingCarbs: userData.dailyNeeds.Carbohydrates - totalCarbs,
                    remainingFat: userData.dailyNeeds.Fat - totalFat,
                }
            },
        };

        return h.response(response).code(200);

    } catch (error) {
        // Log error jika ada masalah
        console.error('Error fetching user data:', error);

        // Respons error jika terjadi masalah
        return h.response({
            status: 'error',
            message: 'An error occurred while fetching user data',
        }).code(500);
    }
};




const updateUserNutritionHandler = async (request, h) => {
    const { userId } = request.params;
    const { dailyNeeds } = request.payload;

    try {
        // Referensi ke koleksi 'data' pengguna
        const dataRef = db.collection('users').doc(userId).collection('data');

        // Ambil dokumen terbaru berdasarkan 'updatedAt'
        const dataSnapshot = await dataRef.orderBy('updatedAt', 'desc').limit(1).get();

        if (dataSnapshot.empty) {
            return h.response({
                status: 'fail',
                message: 'No user data found to update',
            }).code(404);
        }

        // Ambil dokumen pertama (dokumen terbaru)
        const latestDoc = dataSnapshot.docs[0];

        // Update dokumen terbaru
        await dataRef.doc(latestDoc.id).update({
            dailyNeeds,
            updatedAt: new Date(), // Update waktu untuk mencatat perubahan terakhir
        });

        return h.response({
            status: 'success',
            message: 'User daily needs updated successfully',
        }).code(200);
    } catch (error) {
        console.error('Error updating user data:', error);
        return h.response({
            status: 'error',
            message: 'Error updating user data',
        }).code(500);
    }
};




module.exports = { updateUserDataHandler, getUserDataHandler, updateUserNutritionHandler };
