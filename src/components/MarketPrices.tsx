import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Minus, Search, Calendar, MapPin } from 'lucide-react';
import { MarketPrice } from '../types';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function MarketPrices() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, these would come from a backend job that scrapes prices
    // Here we use a static fallback or listen to Firestore if seeded
    const q = query(collection(db, 'marketPrices'), orderBy('lastUpdated', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Fallback dummy data for demo
        setPrices([
          { id: '1', crop: 'গম (গ্রেড এ)', price: 24.5, trend: 'up', region: 'কেন্দ্রীয় বাজার', lastUpdated: new Date() },
          { id: '2', crop: 'ধান (বাসমতি)', price: 38.0, trend: 'stable', region: 'উত্তরাঞ্চল', lastUpdated: new Date() },
          { id: '3', crop: 'সয়াবিন', price: 42.0, trend: 'down', region: 'পশ্চিমাঞ্চল', lastUpdated: new Date() },
          { id: '4', crop: 'সরিষা', price: 56.0, trend: 'up', region: 'কেন্দ্রীয় বাজার', lastUpdated: new Date() },
          { id: '5', crop: 'পেঁয়াজ', price: 18.0, trend: 'down', region: 'দক্ষিণাঞ্চল', lastUpdated: new Date() },
        ]);
      } else {
        setPrices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketPrice)));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">বাজারের দর</h1>
          <p className="text-slate-500">সরাসরি মান্ডির দাম এবং বাজারের গতিধারা</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 flex items-center text-sm font-medium text-slate-500 shadow-sm">
          <Calendar className="w-4 h-4 mr-2" />
          সর্বশেষ আপডেট: আজ সকাল ১০:৩০
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prices.map((item) => (
          <motion.div
            layout
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{item.crop}</h3>
                <div className="flex items-center text-xs text-slate-400 mt-1">
                  <MapPin className="w-3 h-3 mr-1" />
                  {item.region}
                </div>
              </div>
              <div className={`p-2 rounded-xl ${
                item.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 
                item.trend === 'down' ? 'bg-red-50 text-red-600' : 
                'bg-slate-50 text-slate-600'
              }`}>
                {item.trend === 'up' ? <TrendingUp className="w-6 h-6" /> : 
                 item.trend === 'down' ? <TrendingDown className="w-6 h-6" /> : 
                 <Minus className="w-6 h-6" />}
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <span className="text-3xl font-black text-slate-900">৳{item.price}</span>
                <span className="text-slate-400 text-sm ml-1 font-medium">/ কেজি</span>
              </div>
              <span className={`text-xs font-bold ${
                item.trend === 'up' ? 'text-emerald-600' : 
                item.trend === 'down' ? 'text-red-600' : 
                'text-slate-400'
              }`}>
                {item.trend === 'up' ? '+2.4%' : 
                 item.trend === 'down' ? '-1.8%' : 
                 '0.0%'}
              </span>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-50">
              <button className="w-full text-center text-emerald-600 font-bold text-sm hover:underline">
                দামের ইতিহাস দেখুন
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-3xl p-8 text-white">
        <h3 className="text-xl font-bold mb-2 text-emerald-400">বিশেষজ্ঞের মতামত</h3>
        <p className="text-slate-400 mb-6">
          "আঞ্চলিক সরবরাহ কম থাকায় গমের দাম বৃদ্ধি পেয়েছে। কৃষকদের পরামর্শ দেওয়া হচ্ছে যে যদি স্টোরেজ সুবিধা থাকে তবে স্টক ধরে রাখুন, কারণ আগামী মাসে দাম আরও ৫% বাড়বে বলে আশা করা হচ্ছে।"
        </p>
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-slate-800 mr-3 border border-slate-700"></div>
          <div>
            <div className="font-bold">ডঃ আরিফুল ইসলাম</div>
            <div className="text-xs text-slate-500">কৃষি-অর্থনীতিবিদ</div>
          </div>
        </div>
      </div>
    </div>
  );
}
