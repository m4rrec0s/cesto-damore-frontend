import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBrzgKoPXINKcuR85cLVDnYSRd3dgD23gs",
  authDomain: "cestodamore-3e0b8.firebaseapp.com",
  projectId: "cestodamore-3e0b8",
  storageBucket: "cestodamore-3e0b8.firebasestorage.app",
  messagingSenderId: "402240487531",
  appId: "1:402240487531:web:5d717bcf10df672f73712e",
  measurementId: "G-0FTBXS6BG4",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
