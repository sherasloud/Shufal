import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Leaf, Search, ArrowRight, BookOpen } from 'lucide-react';
import { FarmingTip } from '../types';

export default function ExpertTips() {
  const [crop, setCrop] = useState('');
  const [tips, setTips] = useState<FarmingTip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTips = async () => {
    if (!crop) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/farming-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop, region: 'local' })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'সার্ভার থেকে কোনো উত্তর পাওয়া যায়নি');
      }
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTips(data.tips || []);
    } catch (err: any) {
      console.error("Failed to fetch tips:", err);
      // Fallback tips for common crops if API fails
      if (crop.toLowerCase().includes('ধান')) {
        setTips([
          { title: 'সঠিক বীজ নির্বাচন', content: 'উন্নত ফলনের জন্য সার্টিফাইড বীজ ব্যবহার করুন।' },
          { title: 'সুষম সার প্রয়োগ', content: 'মাটি পরীক্ষার মাধ্যমে সঠিক পরিমাণে সার ব্যবহার নিশ্চিত করুন।' },
          { title: 'আগাছা দমন', content: 'ধান রোপণের ৩০-৪০ দিনের মধ্যে প্রথম নিড়ানি দিন।' }
        ]);
      } else {
        setError(err.message === 'Failed to fetch' ? 'ইন্টারনেট সংযোগ পরীক্ষা করুন' : err.message);
      }
    }
    setLoading(false);
  };

  const categories = [
    { name: 'জৈব চাষ', icon: Leaf, count: 24, color: 'text-emerald-500', query: 'Organic Farming' },
    { name: 'পোকামাকড় দমন', icon: Sparkles, count: 18, color: 'text-orange-500', query: 'Pest Control' },
    { name: 'সেচ ব্যবস্থা', icon: BookOpen, count: 12, color: 'text-blue-500', query: 'Irrigation Management' },
  ];

  const handleCategoryClick = (query: string) => {
    setCrop(query);
    setError(null);
    setTimeout(() => {
      fetchTipsDirectly(query);
    }, 100);
  };

  const fetchTipsDirectly = async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/farming-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop: searchQuery, region: 'local' })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'সার্ভার থেকে কোনো উত্তর পাওয়া যায়নি');
      }
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTips(data.tips || []);
    } catch (err: any) {
      console.error("Failed to fetch tips:", err);
      // Fallback tips for common categories if API fails
      if (searchQuery.toLowerCase().includes('organic')) {
        setTips([
          { title: 'জৈব সার তৈরি', content: 'রান্নাঘরের বর্জ্য এবং গোবর মিশিয়ে উন্নত মানের কম্পোস্ট তৈরি করুন।' },
          { title: 'প্রাকৃতিক বালাইনাশক', content: 'নিম পাতা বা তামাক পাতা সিদ্ধ পানি ব্যবহার করে পোকা দমন করুন।' },
          { title: 'শস্য পর্যায়', content: 'একই জমিতে বারবার একই ফসল না ফলিয়ে ফসল পরিবর্তন করুন।' }
        ]);
      } else {
        setError(err.message === 'Failed to fetch' ? 'ইন্টারনেট সংযোগ পরীক্ষা করুন' : err.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center">
          বিশেষজ্ঞের পরামর্শ 
          <Sparkles className="w-6 h-6 ml-2 text-yellow-500 animate-pulse" />
        </h1>
        <p className="text-slate-500 mt-2">আপনার নির্দিষ্ট ফসলের জন্য এআই-চালিত অন্তর্দৃষ্টি এবং পেশাদার নির্দেশিকা পান</p>
      </header>

      {/* Search Input */}
      <div className="bg-emerald-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-6">আপনি আজ কী চাষ করছেন?</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="ফসলের নাম লিখুন (যেমন- ধান, টমেটো, ভুট্টা)"
                className="w-full pl-12 pr-4 py-4 bg-white text-slate-900 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-500/50 transition-all font-medium"
                value={crop}
                onChange={e => setCrop(e.target.value)}
              />
            </div>
            <button 
              onClick={fetchTips}
              disabled={loading || !crop}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-white px-10 py-4 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>পরামর্শ নিন</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-800 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 flex items-center justify-between"
        >
          <span className="font-medium">দুঃখিত: {error}</span>
          <button onClick={() => setError(null)} className="text-sm font-bold underline">মুছে ফেলুন</button>
        </motion.div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full"
          />
          <p className="text-slate-500 font-medium animate-pulse">বিশেষজ্ঞের পরামর্শ তৈরি হচ্ছে...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tips.length > 0 ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">{crop}-এর জন্য বিশেষজ্ঞ নির্দেশিকা</h3>
                <button 
                  onClick={() => { setTips([]); setCrop(''); }}
                  className="text-emerald-600 font-bold hover:underline"
                >
                  সব ক্যাটাগরি দেখুন
                </button>
              </div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid gap-6"
              >
                {tips.map((tip, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">{tip.title}</h4>
                        <p className="text-slate-600 leading-relaxed">{tip.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <button 
                  key={cat.name} 
                  onClick={() => handleCategoryClick(cat.query)}
                  className="bg-white p-8 rounded-3xl border border-slate-100 text-center hover:scale-[1.02] transition-all hover:shadow-lg cursor-pointer group"
                >
                  <cat.icon className={`w-12 h-12 mx-auto mb-4 ${cat.color} group-hover:scale-110 transition-transform`} />
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{cat.name}</h3>
                  <p className="text-slate-400 text-sm">{cat.count}টি পরামর্শ</p>
                </button>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
