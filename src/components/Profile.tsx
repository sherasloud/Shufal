import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { User, Mail, Shield, LogOut, Package, MessageSquare, Gavel, TrendingUp } from 'lucide-react';
import { signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const ADMIN_EMAIL = 'shufalharvest@gmail.com';

export default function Profile() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const updateRole = async (newRole: UserRole) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      setProfile(prev => prev ? { ...prev, role: newRole } : null);
      alert('আপনার রোল সফলভাবে আপডেট করা হয়েছে!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center max-w-sm">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">আপনি লগইন করেননি</h2>
          <p className="text-slate-500 mb-6">আপনার প্রোফাইল দেখতে দয়া করে লগইন করুন।</p>
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
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="relative h-48 bg-emerald-600 rounded-3xl overflow-hidden shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/50 to-transparent"></div>
      </header>

      <div className="px-8 -mt-20 relative">
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
            <div className="relative">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                alt={user.displayName || 'User'} 
                className="w-32 h-32 rounded-3xl border-4 border-white shadow-lg bg-white"
              />
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-black text-slate-900 mb-1">
                {user.displayName || 'কৃষক বন্ধু'}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <p className="text-slate-500 flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {user.email}
                </p>
                <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-emerald-200">
                  {profile?.role === 'farmer' ? 'কৃষক' : profile?.role === 'trader' ? 'ব্যবসায়ী' : profile?.role === 'admin' ? 'অ্যাডমিন' : 'ক্রেতা'}
                </div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span>লগআউট</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
            <div className="md:col-span-2 bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-emerald-600" />
                আপনার ভূমিকা পরিবর্তন করুন
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => updateRole('farmer')}
                  className={`p-4 rounded-2xl border-2 transition-all text-left group ${profile?.role === 'farmer' ? 'border-emerald-500 bg-white shadow-md' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
                >
                  <Package className={`w-8 h-8 mb-2 ${profile?.role === 'farmer' ? 'text-emerald-500' : 'text-slate-400 group-hover:text-emerald-400'}`} />
                  <div className="font-bold text-slate-900">আমি একজন কৃষক</div>
                  <div className="text-xs text-slate-500">পণ্য তালিকাভুক্ত এবং বিক্রি করতে চান</div>
                </button>
                <button 
                  onClick={() => updateRole('trader')}
                  className={`p-4 rounded-2xl border-2 transition-all text-left group ${profile?.role === 'trader' ? 'border-blue-500 bg-white shadow-md' : 'border-slate-200 bg-white hover:border-blue-200'}`}
                >
                  <TrendingUp className={`w-8 h-8 mb-2 ${profile?.role === 'trader' ? 'text-blue-500' : 'text-slate-400 group-hover:text-blue-400'}`} />
                  <div className="font-bold text-slate-900">আমি একজন ব্যবসায়ী</div>
                  <div className="text-xs text-slate-500">পণ্য কেনা এবং পুনরায় বিক্রি করতে চান</div>
                </button>
                <button 
                  onClick={() => updateRole('buyer')}
                  className={`p-4 rounded-2xl border-2 transition-all text-left group ${profile?.role === 'buyer' ? 'border-slate-500 bg-white shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <User className={`w-8 h-8 mb-2 ${profile?.role === 'buyer' ? 'text-slate-700' : 'text-slate-400 group-hover:text-slate-500'}`} />
                  <div className="font-bold text-slate-900">আমি একজন ক্রেতা</div>
                  <div className="text-xs text-slate-500">শুধুমাত্র পণ্য ক্রয় করতে চান</div>
                </button>
              </div>
            </div>

            {user.email === ADMIN_EMAIL && (
              <div className="md:col-span-2">
                <button 
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center justify-center p-4 bg-purple-50 text-purple-700 rounded-2xl border border-purple-100 font-bold hover:bg-purple-100 transition-colors mb-4"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  অ্যাডমিন প্যানেল পরিচালনা করুন
                </button>
              </div>
            )}
            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-emerald-600" />
                আমার তালিকাভুক্ত পণ্য
              </h3>
              <div className="bg-slate-50 p-6 rounded-2xl text-center border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">আপনি এখনো কোনো পণ্য তালিকাভুক্ত করেননি।</p>
                <button 
                  onClick={() => navigate('/')}
                  className="mt-4 text-emerald-600 font-bold text-sm hover:underline"
                >
                  পণ্য যোগ করুন
                </button>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-emerald-600" />
                আমার পোস্টসমূহ
              </h3>
              <div className="bg-slate-50 p-6 rounded-2xl text-center border border-dashed border-slate-200">
                <p className="text-slate-400 text-sm">আপনি এখনো কোনো পোস্ট করেননি।</p>
                <button 
                  onClick={() => navigate('/forum')}
                  className="mt-4 text-emerald-600 font-bold text-sm hover:underline"
                >
                  ফোরামে আলোচনা শুরু করুন
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
