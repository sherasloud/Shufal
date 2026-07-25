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
  Leaf,
  MoreHorizontal
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
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { seedInitialData } from './lib/seedData';
import { UserProfile } from './types';

const ADMIN_EMAILS = ['shufalharvest@gmail.com', 'shustobd@gmail.com'];

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
          const profile = userDoc.data() as UserProfile;
          // Ensure admins have the correct role in DB
          if (ADMIN_EMAILS.includes(user.email || '') && profile.role !== 'admin') {
            const updatedProfile = { ...profile, role: 'admin' as const };
            await updateDoc(userDocRef, { role: 'admin' });
            setUserProfile(updatedProfile);
          } else {
            setUserProfile(profile);
          }
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
              role: ADMIN_EMAILS.includes(user.email || '') ? 'admin' : 'buyer',
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

  const bottomNavItems = [
    { name: 'বাজার', path: '/', icon: ShoppingBasket },
    { name: 'আবহাওয়া', path: '/weather', icon: CloudSun },
    { name: 'ফোরাম', path: '/forum', icon: MessageCircle },
    { name: 'প্রোফাইল', path: '/profile', icon: User },
  ];

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  return (
    <>
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 md:px-8">
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

          {/* Mobile Top Header Right Action (User or Login) */}
          <div className="flex md:hidden items-center space-x-2">
            {user ? (
              <Link to="/profile" className="p-1 rounded-full border border-slate-200">
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                  className="w-7 h-7 rounded-full" 
                  alt="" 
                />
              </Link>
            ) : (
              <button 
                onClick={handleAuth}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm"
              >
                লগইন
              </button>
            )}
            <button 
              className="p-2 text-slate-600 rounded-xl hover:bg-slate-100" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              title="আরও অপশন (3 dots)"
            >
              <MoreHorizontal className="w-6 h-6 text-slate-800" />
            </button>
          </div>
        </div>
      </nav>

      {/* App Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-1.5 flex justify-around items-center shadow-lg">
        {bottomNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
                isActive ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-500 font-medium hover:text-slate-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[11px] mt-0.5 tracking-tight">{item.name}</span>
            </Link>
          );
        })}

        {/* 3 Dots Menu Button in Bottom Nav */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            isMenuOpen ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-500 font-medium hover:text-slate-900'
          }`}
        >
          <MoreHorizontal className={`w-5 h-5 ${isMenuOpen ? 'scale-110 text-emerald-600' : ''}`} />
          <span className="text-[11px] mt-0.5 tracking-tight">আরও</span>
        </button>
      </div>

      {/* 3 Dots Overlay Bottom Sheet */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[2rem] p-6 shadow-2xl border-t border-slate-100 max-h-[80vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />
              
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <MoreHorizontal className="w-5 h-5 text-emerald-600" />
                  সকল অপশনসমূহ
                </h3>
                <button 
                  onClick={() => setIsMenuOpen(false)} 
                  className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <Link
                  to="/"
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                    location.pathname === '/' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <ShoppingBasket className="w-6 h-6 text-emerald-600" />
                  <span className="text-xs font-bold">বাজার</span>
                </Link>

                <Link
                  to="/weather"
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                    location.pathname === '/weather' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <CloudSun className="w-6 h-6 text-amber-500" />
                  <span className="text-xs font-bold">আবহাওয়া</span>
                </Link>

                <Link
                  to="/prices"
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                    location.pathname === '/prices' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  <span className="text-xs font-bold">বাজারের দর</span>
                </Link>

                <Link
                  to="/forum"
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                    location.pathname === '/forum' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                  <span className="text-xs font-bold">ফোরাম</span>
                </Link>

                <Link
                  to="/tips"
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                    location.pathname === '/tips' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <Lightbulb className="w-6 h-6 text-amber-600" />
                  <span className="text-xs font-bold">কৃষি পরামর্শ</span>
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all ${
                    location.pathname === '/profile' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-slate-50 border-slate-100 text-slate-700'
                  }`}
                >
                  <User className="w-6 h-6 text-emerald-600" />
                  <span className="text-xs font-bold">প্রোফাইল</span>
                </Link>
              </div>

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-white p-4 rounded-2xl font-bold text-sm mb-4"
                >
                  <User className="w-5 h-5 text-amber-400" />
                  <span>অ্যাডমিন প্যানেল</span>
                </Link>
              )}

              {!user && (
                <button
                  onClick={() => { handleAuth(); setIsMenuOpen(false); }}
                  className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold text-sm shadow-md"
                >
                  লগইন / রেজিস্ট্রেশন
                </button>
              )}
            </motion.div>
          </div>
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
        <main className="max-w-7xl mx-auto px-4 pt-8 pb-24 md:pb-8 md:px-8">
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
        <footer className="bg-white border-t border-slate-200 py-12 px-4 md:px-8 mt-12 mb-16 md:mb-0">
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
