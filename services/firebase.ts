
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your verified Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD3Y70b8xJL8zipoRHAzYyjz9caLTrYLr8",
  authDomain: "hal-saha-pro-match-organizer.firebaseapp.com",
  projectId: "hal-saha-pro-match-organizer",
  storageBucket: "hal-saha-pro-match-organizer.firebasestorage.app",
  messagingSenderId: "961164086534",
  appId: "1:961164086534:web:9a94ea1feebd7de993a287"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
