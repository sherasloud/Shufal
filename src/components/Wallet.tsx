import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, CreditCard } from 'lucide-react';
import { Transaction, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface WalletProps {
  profile: UserProfile;
}

export default function WalletComponent({ profile }: WalletProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddingMoney, setIsAddingMoney] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile.uid) return;

    const q = query(
      collection(db, 'users', profile.uid, 'transactions'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    return () => unsubscribe();
  }, [profile.uid]);

  const handleTopUp = async (amount: number) => {
    if (!profile.uid || amount <= 0) return;
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      
      // Update balance
      await updateDoc(userRef, {
        walletBalance: increment(amount)
      });

      // Record transaction
      await addDoc(collection(db, 'users', profile.uid, 'transactions'), {
        userId: profile.uid,
        amount,
        type: 'credit',
        description: 'টাকা যোগ করা হয়েছে (Demo Top-up)',
        timestamp: serverTimestamp()
      });

      setIsAddingMoney(false);
      setTopUpAmount(0);
      alert(`${amount}৳ সফলভাবে যোগ করা হয়েছে!`);
    } catch (error) {
      console.error('Top-up error:', error);
      alert('দুঃখিত, টাকা যোগ করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">বর্তমান ব্যালেন্স</p>
              <h2 className="text-5xl font-black tracking-tighter">৳{profile.walletBalance || 0}</h2>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
          
          <button 
            onClick={() => setIsAddingMoney(true)}
            className="flex items-center space-x-2 bg-white text-emerald-700 px-6 py-3 rounded-2xl font-black hover:bg-emerald-50 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>টাকা যোগ করুন</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAddingMoney && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">টাকা যোগ করুন (Demo)</h3>
              <button onClick={() => setIsAddingMoney(false)} className="text-slate-400">বন্ধ করুন</button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[500, 1000, 2000].map(amount => (
                <button
                  key={amount}
                  onClick={() => setTopUpAmount(amount)}
                  className={`py-4 rounded-2xl font-bold border-2 transition-all ${topUpAmount === amount ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 hover:border-emerald-200 text-slate-600'}`}
                >
                  ৳{amount}
                </button>
              ))}
            </div>
            <button
              disabled={loading || topUpAmount === 0}
              onClick={() => handleTopUp(topUpAmount)}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:bg-slate-300 disabled:shadow-none"
            >
              {loading ? 'প্রসেসিং হচ্ছে...' : 'নিশ্চিত করুন'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-900 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-emerald-600" />
            সাম্প্রতিক লেনদেন
          </h3>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-10 text-center">
              <p className="text-slate-400">আপনার এখনো কোনো লেনদেন নেই</p>
            </div>
          ) : (
            transactions.map((tx) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={tx.id}
                className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {tx.type === 'credit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{tx.description}</p>
                    <p className="text-xs text-slate-400">
                      {tx.timestamp?.toDate ? tx.timestamp.toDate().toLocaleString('bn-BD') : 'লোডিং...'}
                    </p>
                  </div>
                </div>
                <div className={`font-black ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.type === 'credit' ? '+' : '-'} ৳{tx.amount}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
