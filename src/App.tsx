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
  MoreHorizontal,
  Wallet,
  ShoppingBag,
  Package,
  CreditCard
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
      {/* Top Header - Clean without top navigation links */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {/* 3 Dots Left Menu Trigger */}
            <button 
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1 font-bold text-sm" 
              onClick={() => setIsMenuOpen(true)}
              title="মেনু (3 dots)"
            >
              <MoreHorizontal className="w-6 h-6 text-emerald-600" />
            </button>

            <Link to="/" className="flex items-center space-x-2 text-emerald-600 font-bold text-xl md:text-2xl tracking-tight">
              <Leaf className="w-7 h-7 md:w-8 md:h-8 text-emerald-600" />
              <span>সুফল</span>
            </Link>
          </div>

          {/* Right Header Action (User Profile / Login) */}
          <div className="flex items-center space-x-3">
            {user ? (
              <Link 
                to="/profile" 
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all border border-slate-200"
              >
                <img 
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                  className="w-6 h-6 rounded-full" 
                  alt="" 
                />
                <span className="hidden sm:inline font-bold">{userProfile?.displayName || user.displayName || 'প্রোফাইল'}</span>
              </Link>
            ) : (
              <button 
                onClick={handleAuth}
                className="bg-emerald-600 text-white px-4 py-2 rounded-full text-xs md:text-sm font-bold shadow-sm hover:bg-emerald-700 transition-all flex items-center space-x-1"
              >
                <User className="w-4 h-4" />
                <span>লগইন</span>
              </button>
            )}
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
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all ${
            isMenuOpen ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-slate-500 font-medium hover:text-slate-900'
          }`}
        >
          <MoreHorizontal className={`w-5 h-5 ${isMenuOpen ? 'scale-110 text-emerald-600' : ''}`} />
          <span className="text-[11px] mt-0.5 tracking-tight">মেনু</span>
        </button>
      </div>

      {/* Left Side Navigation Drawer (Line by Line on the Left) */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[60]">
            {/* Dark Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            />

            {/* Left Slide Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between border-r border-slate-200 overflow-y-auto"
            >
              <div>
                {/* Drawer Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xl">
                    <Leaf className="w-7 h-7 text-emerald-600" />
                    <span className="text-slate-900 font-black">সুফল মেনু</span>
                  </div>
                  <button 
                    onClick={() => setIsMenuOpen(false)} 
                    className="p-2 bg-white rounded-full text-slate-500 hover:text-slate-900 border border-slate-200 shadow-xs"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Line by Line Navigation Items on the Left */}
                <div className="p-4 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                    ন্যাভিগেশন তালিকা
                  </p>

                  <Link
                    to="/"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                      location.pathname === '/' 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ShoppingBasket className="w-5 h-5 shrink-0" />
                    <span>বাজার (Marketplace)</span>
                  </Link>

                  <Link
                    to="/weather"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                      location.pathname === '/weather' 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CloudSun className="w-5 h-5 shrink-0 text-amber-500" />
                    <span>আবহাওয়া তথ্য</span>
                  </Link>

                  <Link
                    to="/prices"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                      location.pathname === '/prices' 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5 shrink-0 text-blue-500" />
                    <span>আজকের বাজারের দর</span>
                  </Link>

                  <Link
                    to="/forum"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                      location.pathname === '/forum' 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <MessageCircle className="w-5 h-5 shrink-0 text-purple-500" />
                    <span>কৃষি ফোরাম</span>
                  </Link>

                  <Link
                    to="/tips"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                      location.pathname === '/tips' 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Lightbulb className="w-5 h-5 shrink-0 text-amber-600" />
                    <span>কৃষি পরামর্শ</span>
                  </Link>

                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                      location.pathname === '/profile' && !location.hash
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-5 h-5 shrink-0 text-emerald-600" />
                    <span>আমার প্রোফাইল</span>
                  </Link>

                  <Link
                    to="/profile#wallet"
                    state={{ section: 'wallet' }}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                      location.hash === '#wallet'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <CreditCard className="w-5 h-5 shrink-0 text-emerald-600" />
                      <span>আমার ওয়ালেট (Wallet)</span>
                    </div>
                    {userProfile?.walletBalance !== undefined && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">
                        ৳{userProfile.walletBalance}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/profile#orders"
                    state={{ section: 'orders' }}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                      location.hash === '#orders'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5 shrink-0 text-blue-600" />
                    <span>আমার অর্ডারসমূহ</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm mt-4 ${
                        location.pathname === '/admin' 
                          ? 'bg-slate-900 text-amber-400 shadow-md' 
                          : 'bg-slate-900/90 text-white hover:bg-slate-900'
                      }`}
                    >
                      <User className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>অ্যাডমিন প্যানেল</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-3">
                {user ? (
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200">
                    <div className="flex items-center space-x-3 min-w-0">
                      <img 
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                        className="w-9 h-9 rounded-full shrink-0" 
                        alt="" 
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{userProfile?.displayName || user.displayName || 'ব্যবহারকারী'}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { auth.signOut(); setIsMenuOpen(false); }}
                      className="text-xs text-rose-600 font-bold hover:underline shrink-0"
                    >
                      লগআউট
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { handleAuth(); setIsMenuOpen(false); }}
                    className="w-full bg-emerald-600 text-white py-3.5 rounded-2xl font-bold text-sm shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center space-x-2"
                  >
                    <User className="w-4 h-4" />
                    <span>লগইন / রেজিস্ট্রেশন</span>
                  </button>
                )}
                <p className="text-center text-[10px] text-slate-400 font-medium">
                  সুফল ডিজিটাল কৃষি প্ল্যাটফর্ম © ২০২৬
                </p>
              </div>
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
