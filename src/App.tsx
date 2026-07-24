import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBasket, 
  CloudSun, 
  TrendingUp, 
  MessageCircle, 
  Lightbulb, 
  Menu, 
  X,
  User,
  Leaf
} from 'lucide-react';
import Marketplace from './components/Marketplace';
import Weather from './components/Weather';
import MarketPrices from './components/MarketPrices';
import Forum from './components/Forum';
import ExpertTips from './components/ExpertTips';
import Profile from './components/Profile';
import Admin from './components/Admin';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider, db } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { seedInitialData } from './lib/seedData';
import { UserProfile } from './types';

const ADMIN_EMAIL = 'shufalharvest@gmail.com';

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // First try to find by UID
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        } else {
          // If not found by UID, check if an admin pre-registered this email
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Pre-registered user found! Update it with the UID
            const existingDoc = querySnapshot.docs[0];
            const profile = {
              ...existingDoc.data(),
              uid: user.uid,
              photoURL: user.photoURL || existingDoc.data().photoURL || '',
              displayName: user.displayName || existingDoc.data().displayName || 'নামহীন',
            } as UserProfile;
            
            // Move the document to use UID as the key for better performance in the future
            await setDoc(doc(db, 'users', user.uid), profile);
            // Optionally delete the old document if it had a different ID
            if (existingDoc.id !== user.uid) {
              await deleteDoc(doc(db, 'users', existingDoc.id));
            }
            
            setUserProfile(profile);
          } else {
            // New user, create fresh profile
            const profile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'নামহীন',
              photoURL: user.photoURL || '',
              role: user.email === ADMIN_EMAIL ? 'admin' : 'buyer',
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'users', user.uid), profile);
            setUserProfile(profile);
          }
        }
        seedInitialData().catch(console.error);
      } else {
        setUserProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (user) {
      // Don't auto-logout
    } else {
      try {
        console.log("Starting login with popup...");
        await signInWithPopup(auth, googleProvider);
      } catch (error: any) {
        console.error("Login failed:", error);
        
        const currentDomain = window.location.hostname;
        
        if (error.code === 'auth/unauthorized-domain') {
          alert(`ত্রুটি: এই ডোমেইনটি (${currentDomain}) ফায়ারবেস অথরাইজড ডোমেইন লিস্টে নেই।\n\nদয়া করে ফায়ারবেস কনসোলে (Authentication > Settings > Authorized domains) এই ডোমেইনটি যোগ করুন।`);
        } else if (error.code === 'auth/popup-closed-by-user') {
          alert('আপনি লগইন উইন্ডোটি বন্ধ করে দিয়েছেন। আবার চেষ্টা করুন।');
        } else if (error.code === 'auth/popup-blocked') {
          alert('আপনার ব্রাউজার পপআপ ব্লক করেছে। দয়া করে পপআপ এলাউ করুন এবং আবার চেষ্টা করুন।');
        } else {
          alert(`লগইন ব্যর্থ হয়েছে: ${error.message}`);
        }
      }
    }
  };

  const navItems = [
    { name: 'বাজার', path: '/', icon: ShoppingBasket },
    { name: 'আবহাওয়া', path: '/weather', icon: CloudSun },
    { name: 'বাজারের দর', path: '/prices', icon: TrendingUp },
    { name: 'ফোরাম', path: '/forum', icon: MessageCircle },
    { name: 'পরামর্শ', path: '/tips', icon: Lightbulb },
  ];

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2 text-emerald-600 font-bold text-2xl tracking-tight">
            <Leaf className="w-8 h-8" />
            <span>সুফল</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 transition-colors font-medium ${
                  location.pathname === item.path ? 'text-emerald-600' : 'text-slate-600 hover:text-emerald-600'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            ))}
            
            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center space-x-2 transition-colors font-bold ${
                  location.pathname === '/admin' ? 'text-emerald-600' : 'text-slate-600 hover:text-emerald-600'
                }`}
              >
                <User className="w-5 h-5" />
                <span>অ্যাডমিন</span>
              </Link>
            )}
            
            {user ? (
              <Link 
                to="/profile"
                className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-full font-medium hover:bg-slate-200 transition-all"
              >
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                  className="w-6 h-6 rounded-full" 
                  alt="" 
                />
                <span>প্রোফাইল</span>
              </Link>
            ) : (
              <button 
                onClick={handleAuth}
                className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-full font-medium hover:bg-emerald-700 transition-all shadow-sm"
              >
                <User className="w-5 h-5" />
                <span>লগইন</span>
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 text-slate-600 font-medium py-2"
                >
                  <item.icon className="w-6 h-6" />
                  <span>{item.name}</span>
                </Link>
              ))}
              
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 text-slate-600 font-bold py-2 border-t border-slate-50 pt-4"
                >
                  <User className="w-6 h-6" />
                  <span>অ্যাডমিন প্যানেল</span>
                </Link>
              )}
              
              {user ? (
                <Link 
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex justify-center items-center space-x-2 bg-slate-100 text-slate-700 px-4 py-3 rounded-xl font-medium"
                >
                  <img 
                    src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                    className="w-6 h-6 rounded-full" 
                    alt="" 
                  />
                  <span>আমার প্রোফাইল</span>
                </Link>
              ) : (
                <button 
                  onClick={() => { handleAuth(); setIsMenuOpen(false); }}
                  className="w-full flex justify-center items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-xl font-medium shadow-sm"
                >
                  <User className="w-5 h-5" />
                  <span>লগইন / রেজিস্ট্রেশন</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <Navigation />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 md:px-8">
          <Routes>
            <Route path="/" element={<Marketplace />} />
            <Route path="/weather" element={<Weather />} />
            <Route path="/prices" element={<MarketPrices />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/tips" element={<ExpertTips />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>


        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-12 px-4 md:px-8 mt-20">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex justify-center items-center space-x-2 text-emerald-600 font-bold text-xl mb-4">
              <Leaf className="w-6 h-6" />
              <span>সুফল</span>
            </div>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              প্রযুক্তির মাধ্যমে কৃষকদের ক্ষমতায়ন। সরাসরি পণ্য বিক্রি করুন, বিশেষজ্ঞদের পরামর্শ নিন এবং সম্প্রদায়ের সাথে যুক্ত হন।
            </p>
            <div className="mt-8 pt-8 border-t border-slate-100 text-slate-400 text-xs">
              © ২০২৪ সুফল কৃষি প্ল্যাটফর্ম। সর্বস্বত্ব সংরক্ষিত।
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
