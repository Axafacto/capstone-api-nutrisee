const admin = require('firebase-admin');
const credentials = require('./key.json');

// Inisialisasi Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(credentials),
    });
}

// Inisialisasi Firestore melalui Firebase Admin
const db = admin.firestore();

// Fungsi untuk memverifikasi setup Firebase
const verifyFirebase = async () => {
    try {
        // Cek project ID
        const projectId = credentials.project_id;
        console.log(`Project ID: ${projectId}`);

        // Cek database ID (Firestore hanya mendukung database default)
        const databaseId = '(default)'; // Database ID default di Firestore
        console.log(`Database ID: ${databaseId}`);

        // Cek daftar koleksi
        const collections = await db.listCollections();

        if (collections.length === 0) {
            console.log('No collections found in Firestore.');
        } else {
            console.log('Available collections:');
            collections.forEach((collection) => console.log(`- ${collection.id}`));
        }
    } catch (error) {
        console.error('Error verifying Firebase setup:', error.message);
    }
};

// Memanggil fungsi verifikasi saat file dijalankan
verifyFirebase();

module.exports = { db };
