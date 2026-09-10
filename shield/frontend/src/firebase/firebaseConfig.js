/**
 * firebaseConfig.js
 * Source: prompt §4.1 — exact values, do not modify.
 * 
 * NOTE: This is a Firebase **web client config** — it is intentionally public.
 * Access control is enforced by Firestore Security Rules, not by hiding this key.
 * Do not add environment-variable indirection here without also setting up
 * actual Firestore Security Rules (prompt §4.1).
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAm3BqAwmWBz__C7SAKOhDhADxiVDE38No",
  authDomain: "conveyorbelt-pdm.firebaseapp.com",
  projectId: "conveyorbelt-pdm",
  storageBucket: "conveyorbelt-pdm.firebasestorage.app",
  messagingSenderId: "442274925279",
  appId: "1:442274925279:web:afea81ae499e7315e5376a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
