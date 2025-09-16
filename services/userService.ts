/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { db, storage } from '../firebase';
// FIX: Switched to Firebase v8 compat imports to resolve module errors.
// FIX: Changed the Firebase v8 compat import from a default import to a namespace import (`import * as firebase from ...`). Added side-effect imports for `auth` and `firestore` to make their types available.
// FIX: Reverted incorrect namespace import to a default import for Firebase v8 compat to resolve type errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { User, CreditTransaction } from '../App';
import { GeneratedImage } from '../components/GalleryScreen';

/**
 * Creates a new user profile document in Firestore.
 */
// FIX: Changed type from `firebase.auth.User` to `firebase.User` to match v8 compat types.
export const createUserProfile = async (userAuth: firebase.User, name: string): Promise<void> => {
    const userRef = db.collection("users").doc(userAuth.uid);
    const newUser: User = {
        uid: userAuth.uid,
        name,
        email: userAuth.email!,
        credits: 25,
        creditHistory: [{
            reason: 'Sign-up bonus',
            amount: 25,
            date: new Date().toISOString()
        }]
    };
    await userRef.set(newUser);
};

/**
 * Retrieves a user's profile from Firestore.
 */
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const userRef = db.collection("users").doc(uid);
    const docSnap = await userRef.get();
    if (docSnap.exists) {
        const user = docSnap.data() as User;
        // Ensure credit history is sorted newest first
        if (user.creditHistory) {
            user.creditHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return user;
    }
    return null;
};

/**
 * Updates a user's profile data in Firestore.
 */
export const updateUserProfile = async (uid: string, data: Partial<User>): Promise<User | null> => {
    const userRef = db.collection("users").doc(uid);
    await userRef.update(data);
    return getUserProfile(uid);
};


/**
 * Updates a user's credit balance and adds a transaction to their history.
 */
export const updateUserCredits = async (uid: string, amount: number, reason: string): Promise<User | null> => {
    const userRef = db.collection("users").doc(uid);
    
    const newTransaction: CreditTransaction = {
        reason,
        amount,
        date: new Date().toISOString()
    };
    
    await userRef.update({
        credits: firebase.firestore.FieldValue.increment(amount),
        creditHistory: firebase.firestore.FieldValue.arrayUnion(newTransaction)
    });

    return getUserProfile(uid);
};

/**
 * Uploads an image file to Firebase Storage for a specific user.
 */
export const uploadImage = async (uid: string, file: File, fileName?: string): Promise<string> => {
    const filePath = `users/${uid}/generated/${fileName || file.name}`;
    const storageRef = storage.ref(filePath);
    const uploadResult = await storageRef.put(file);
    const downloadURL = await uploadResult.ref.getDownloadURL();
    return downloadURL;
};

/**
 * Adds image metadata to the user's gallery subcollection in Firestore.
 */
export const addImageToGallery = async (uid: string, imageData: Omit<GeneratedImage, 'id'>): Promise<GeneratedImage> => {
    const galleryCollectionRef = db.collection('users').doc(uid).collection('gallery');
    const docRef = await galleryCollectionRef.add(imageData);
    return { id: docRef.id, ...imageData };
};


/**
 * Retrieves all gallery images for a user from Firestore.
 */
export const getGalleryImages = async (uid: string): Promise<GeneratedImage[]> => {
    const galleryCollectionRef = db.collection('users').doc(uid).collection('gallery');
    const q = galleryCollectionRef.orderBy('createdAt', 'desc');
    const querySnapshot = await q.get();
    
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as GeneratedImage));
};


/**
 * Updates a specific gallery image's data (e.g., after upscaling).
 */
export const updateGalleryImage = async (uid: string, imageId: string, data: Partial<GeneratedImage>): Promise<GeneratedImage> => {
    const imageDocRef = db.collection('users').doc(uid).collection('gallery').doc(imageId);
    await imageDocRef.update(data);

    const updatedDoc = await imageDocRef.get();
    return { id: updatedDoc.id, ...updatedDoc.data() } as GeneratedImage;
};
