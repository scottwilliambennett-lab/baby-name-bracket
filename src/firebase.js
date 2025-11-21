import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBSFCpPmyRKyWsuRASEyujr3YrNz2yapPY",
  authDomain: "baby-bracket.firebaseapp.com",
  projectId: "baby-bracket",
  storageBucket: "baby-bracket.firebasestorage.app",
  messagingSenderId: "437969158156",
  appId: "1:437969158156:web:de12e89bfbc54f7a602e29"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth
const auth = getAuth(app);

export { db, auth };