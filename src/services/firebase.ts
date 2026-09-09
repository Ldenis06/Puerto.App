import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web configuration identifies this public web app; it is not a secret.
const firebaseConfig = {
  apiKey: 'AIzaSyDIs6r3RARv1vME5R0-egEXrCVAULHeTiY',
  authDomain: 'puerto-app-e06c3.firebaseapp.com',
  projectId: 'puerto-app-e06c3',
  storageBucket: 'puerto-app-e06c3.firebasestorage.app',
  messagingSenderId: '937109907666',
  appId: '1:937109907666:web:6836561050786c5345650b',
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
export const firestore = getFirestore(app);

export async function signInWithGoogle(): Promise<string> {
  const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
  const email = result.user.email?.trim().toLowerCase();
  if (!email) throw new Error('La cuenta de Google no devolvió una dirección de correo.');
  return email;
}
