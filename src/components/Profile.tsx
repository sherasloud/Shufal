import React from 'react';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { User, Mail, Shield, LogOut, Package, MessageSquare } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const user = auth.currentUser;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
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
              <p className="text-slate-500 flex items-center justify-center md:justify-start">
                <Mail className="w-4 h-4 mr-2" />
                {user.email}
              </p>
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
