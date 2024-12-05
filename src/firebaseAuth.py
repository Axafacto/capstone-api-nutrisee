import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import os


current_dir = os.path.dirname(os.path.abspath(__file__))
key_path = os.path.join(current_dir, 'key.json')

# Use a service account.
cred = credentials.Certificate(key_path)

app = firebase_admin.initialize_app(cred)

db = firestore.client()

users_ref = db.collection("users")
docs = users_ref.stream()

for doc in docs:
    print(f"{doc.id} => {doc.to_dict()}")