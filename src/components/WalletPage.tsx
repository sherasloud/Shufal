import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { CreditCard, User, Wallet as WalletIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import WalletComponent from './Wallet';

export default function WalletPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center max-w-sm">
          <WalletIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">আপনি লগইন করেননি</h2>
          <p className="text-slate-500 mb-6">আপনার ওয়ালেট ব্যালেন্স এবং লেনদেন দেখতে দয়া করে লগইন করুন।</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold"
          >
            হোম পেজে ফিরে যান
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-50 p-3 rounded-2xl">
            <CreditCard className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">ডিজিটাল ওয়ালেট</h1>
            <p className="text-xs text-slate-500">সুরক্ষিত পেমেন্ট এবং তাৎক্ষণিক ট্রানজ্যাকশন</p>
          </div>
        </div>
      </div>

      <WalletComponent profile={profile} />
    </div>
  );
}
