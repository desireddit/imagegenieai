/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Import the functions you need from the SDKs you need
// FIX: Switched to Firebase v8 compat imports to resolve module errors.
// FIX: Changed the Firebase v8 compat import from a default import to a namespace import (`import * as firebase from ...`).
// FIX: Reverted incorrect namespace import to a default import for Firebase v8 compat to resolve initialization errors.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJ46Zo20_WmSNsOa6WB8MZSOLguQbPu-s",
  authDomain: "imagegenieai.firebaseapp.com",
  projectId: "imagegenieai",
  storageBucket: "imagegenieai.firebasestorage.app",
  messagingSenderId: "1070485950348",
  appId: "1:1070485950348:web:b6f8fd1bc5aac3369510a9",
  measurementId: "G-1Y4G5TCZS5"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
