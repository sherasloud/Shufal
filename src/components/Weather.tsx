import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CloudRain, Sun, Wind, Thermometer, MapPin, ArrowRight } from 'lucide-react';
import { WeatherAlert } from '../types';
import { useNavigate } from 'react-router-dom';

export default function Weather() {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/weather-alerts')
      .then(res => res.json())
      .then(data => {
        setAlerts(data);
        setLoading(false);
      });
  }, []);

  const stats = [
    { label: 'তাপমাত্রা', value: '২৮°সে', icon: Thermometer, color: 'text-orange-500' },
    { label: 'আর্দ্রতা', value: '৬৫%', icon: CloudRain, color: 'text-blue-500' },
    { label: 'বাতাসের গতি', value: '১২ কিমি/ঘ', icon: Wind, color: 'text-slate-500' },
    { label: 'পূর্বাভাস', value: 'রৌদ্রোজ্জ্বল', icon: Sun, color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">আবহাওয়া ড্যাশবোর্ড</h1>
        <p className="text-slate-500">রিয়েল-টাইম সতর্কতা এবং স্থানীয় কৃষি আবহাওয়া তথ্য</p>
      </header>

      {/* Current Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
            <stat.icon className={`w-8 h-8 mb-3 ${stat.color}`} />
            <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Alerts */}
      <section>
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
          সক্রিয় সতর্কতা
        </h2>
        
        {loading ? (
          <div className="grid gap-4">
            {[1, 2].map(i => <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={alert.id}
                className={`p-6 rounded-2xl border-l-4 flex items-start gap-4 shadow-sm ${
                  alert.severity === 'High' 
                  ? 'bg-red-50 border-red-500' 
                  : 'bg-orange-50 border-orange-500'
                }`}
              >
                <div className={`p-3 rounded-full ${alert.severity === 'High' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{alert.type}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      alert.severity === 'High' ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'
                    }`}>
                      {alert.severity === 'High' ? 'উচ্চ' : 'মাঝারি'} ঝুঁকি
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mb-2">{alert.message}</p>
                  <div className="flex items-center text-xs font-medium text-slate-400">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span>Affecting: {alert.region} Region</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Recommendations */}
      <section className="bg-emerald-600 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-xl">
          <h2 className="text-2xl font-bold mb-4">খামার ব্যবস্থাপনা টিপ</h2>
          <p className="text-emerald-50 mb-6 opacity-90">
            বর্তমান আর্দ্রতা এবং প্রত্যাশিত বৃষ্টিপাতের উপর ভিত্তি করে, আমরা পরবর্তী ৪৮ ঘন্টার জন্য কোনো কীটনাশক স্প্রে না করার পরামর্শ দিচ্ছি।
          </p>
          <button 
            onClick={() => navigate('/tips')}
            className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-lg flex items-center gap-2"
          >
            <span>বিশেষজ্ঞ নির্দেশিকা দেখুন</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
        <CloudRain className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-emerald-500 opacity-20 rotate-12" />
      </section>
    </div>
  );
}
