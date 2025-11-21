
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Function to sync Firebase Auth User with Firestore User Document
  const syncUserToFirestore = async (firebaseUser: User) => {
    if (!db) return;

    try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
    
        const userData: Partial<UserProfile> = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          lastLogin: new Date(),
        };
    
        if (!userSnap.exists()) {
          // Create new user document
          await setDoc(userRef, {
            ...userData,
            createdAt: serverTimestamp(),
          });
        } else {
          // Update existing user login time
          await setDoc(userRef, userData, { merge: true });
        }
        
        // Update local state
        setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            createdAt: userSnap.exists() ? userSnap.data().createdAt?.toDate() : new Date(),
            lastLogin: new Date(),
        });
    } catch (error) {
        console.error("Error syncing user to Firestore:", error);
        // Fallback to just setting state if DB fails
        setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            createdAt: new Date(),
            lastLogin: new Date(),
        });
    }
  };

  const login = async () => {
    try {
      if (!auth || !googleProvider) {
        console.log("Running in Demo Mode");
        // MOCK LOGIN FOR DEMO PURPOSES
        const mockUser: UserProfile = {
            uid: 'demo-user-123',
            email: 'demo@freelance.th',
            displayName: 'สมชาย งานดี (Demo)',
            photoURL: null,
            createdAt: new Date(),
            lastLogin: new Date()
        };
        // Store in localStorage to persist across refreshes in demo mode
        localStorage.setItem('demo_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return;
      }

      const result = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(result.user);
    } catch (error: any) {
      console.error("Login Failed", error);
      if (error?.code === 'auth/invalid-api-key') {
          alert("Firebase configuration is invalid. Checking console for details.");
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
        if(auth) {
            await signOut(auth);
        } else {
            // Clear demo user
            localStorage.removeItem('demo_user');
        }
        setUser(null);
    } catch (error) {
      console.error("Logout Failed", error);
    }
  };

  useEffect(() => {
    // Check for real Firebase Auth
    if (auth) {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            await syncUserToFirestore(firebaseUser);
          } else {
            setUser(null);
          }
          setLoading(false);
        });
        return () => unsubscribe();
    } else {
        // Check for Demo User in localStorage
        const demoUserStr = localStorage.getItem('demo_user');
        if (demoUserStr) {
            try {
                const demoUser = JSON.parse(demoUserStr);
                // Fix date strings back to Date objects
                demoUser.createdAt = new Date(demoUser.createdAt);
                demoUser.lastLogin = new Date(demoUser.lastLogin);
                setUser(demoUser);
            } catch (e) {
                localStorage.removeItem('demo_user');
            }
        }
        setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
