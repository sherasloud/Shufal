import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { motion } from 'motion/react';
import { User, Mail, Shield, LogOut, CheckCircle2, UserCheck, Key, ShieldAlert } from 'lucide-react';
import { signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const ADMIN_EMAILS = ['shustobd@gmail.com', 'admin@shufal.com'];

export default function Profile() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAdminUser = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      }
    });
    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateRole = async (newRole: UserRole) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      setProfile(prev => prev ? { ...prev, role: newRole } : null);
      alert('আপনার অ্যাকাউন্ট রোল পরিবর্তন সফল হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center max-w-sm">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">আপনি লগইন করেননি</h2>
          <p className="text-slate-500 mb-6">আপনার প্রোফাইল তথ্য দেখতে দয়া করে লগইন করুন।</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-md"
          >
            হোম পেজে ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Cover Banner */}
      <header className="relative h-44 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent"></div>
      </header>

      {/* Main Profile Info Card */}
      <div className="px-4 sm:px-8 -mt-20 relative">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 space-y-8">
          
          {/* Top Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-slate-100">
            <div className="relative">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                alt={user.displayName || 'User'} 
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-4 border-white shadow-lg bg-white object-cover"
              />
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-md border-2 border-white">
                <Shield className="w-5 h-5" />
              </div>
            </div>

            <div className="text-center sm:text-left flex-1 space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                {user.displayName || 'কৃষক বন্ধু'}
              </h1>
              <p className="text-slate-500 text-sm flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user.email}</span>
              </p>
              
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight border border-emerald-200">
                  {profile?.role === 'farmer' ? '🌾 কৃষক' : profile?.role === 'trader' ? '🏪 ব্যবসায়ী' : profile?.role === 'admin' ? '🛡️ অ্যাডমিন' : '🛒 সাধারণ ক্রেতা'}
                </span>
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                  ভারিফাইড সদস্য
                </span>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold px-4 py-2.5 rounded-2xl transition-all text-xs shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>লগআউট</span>
            </button>
          </div>

          {/* Account Details Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              প্রোফাইল বিবরণ ও বিস্তারিত তথ্য
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">নাম (Display Name)</p>
                <p className="font-bold text-slate-800">{user.displayName || 'অনির্দিষ্ট'}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ইমেইল ঠিকানা</p>
                <p className="font-bold text-slate-800">{user.email}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">অ্যাকাউন্ট আইডি (UID)</p>
                <p className="font-mono text-xs text-slate-600 truncate">{user.uid}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">অ্যাকাউন্ট স্ট্যাটাস</p>
                <p className="font-bold text-emerald-600 flex items-center gap-1 text-sm">
                  <CheckCircle2 className="w-4 h-4" /> সক্রিয় (Active)
                </p>
              </div>
            </div>

            {/* Change Account Role Option */}
            <div className="bg-emerald-50/60 border border-emerald-100 p-5 rounded-2xl space-y-3">
              <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                আপনার রোল (ভূমিকা) পরিবর্তন করুন:
              </h4>
              <p className="text-xs text-emerald-800/80">
                আপনি কিভাবে সুফল প্ল্যাটফর্ম ব্যবহার করতে চান নির্বাচন করুন:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateRole('farmer')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                    profile?.role === 'farmer'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🌾 কৃষক
                </button>
                <button
                  onClick={() => updateRole('trader')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                    profile?.role === 'trader'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🏪 ব্যবসায়ী
                </button>
                <button
                  onClick={() => updateRole('buyer')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                    profile?.role === 'buyer'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🛒 ক্রেতা
                </button>
              </div>
            </div>

            {/* Admin Panel Button if Admin */}
            {isAdminUser && (
              <div className="pt-2">
                <button 
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center justify-center p-4 bg-slate-900 text-amber-400 rounded-2xl border border-slate-800 font-bold hover:bg-slate-800 transition-all text-sm shadow-md"
                >
                  <ShieldAlert className="w-5 h-5 mr-2 text-amber-400" />
                  অ্যাডমিন প্যানেল পরিচালনা করুন
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
