import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Post } from '../types';
import { motion } from 'motion/react';
import { MessageSquare, ThumbsUp, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Forum() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState({ title: '', content: '' });

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post)));
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;
    
    if (!auth.currentUser) {
      alert('পোস্ট করতে দয়া করে লগইন করুন।');
      return;
    }

    try {
      await addDoc(collection(db, 'posts'), {
        ...newPost,
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'কৃষক',
        likes: 0,
        createdAt: serverTimestamp()
      });
      setNewPost({ title: '', content: '' });
    } catch (error) {
      console.error("Error posting:", error);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        likes: increment(1)
      });
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">কমিউনিটি ফোরাম</h1>
        <p className="text-slate-500">জ্ঞান ভাগ করুন, প্রশ্ন করুন এবং অন্যান্য কৃষকদের সাথে যুক্ত হন</p>
      </header>

      {/* Create Post */}
      <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <h2 className="text-lg font-bold mb-4">আলোচনা শুরু করুন</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="আপনার মনে কী আছে? (শিরোনাম)"
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none"
            value={newPost.title}
            onChange={e => setNewPost({...newPost, title: e.target.value})}
          />
          <textarea
            placeholder="আপনার অভিজ্ঞতা শেয়ার করুন বা প্রশ্ন করুন..."
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl h-32 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            value={newPost.content}
            onChange={e => setNewPost({...newPost, content: e.target.value})}
          />
          <div className="flex justify-end">
            <button className="flex items-center space-x-2 bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-md">
              <Send className="w-5 h-5" />
              <span>পোস্ট করুন</span>
            </button>
          </div>
        </form>
      </section>

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map((post) => (
          <motion.div
            layout
            key={post.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-slate-200 p-8 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900">{post.authorName}</div>
                <div className="text-xs text-slate-400">
                  {post.createdAt ? formatDistanceToNow(post.createdAt.toDate()) + ' ago' : 'Just now'}
                </div>
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-3 text-slate-900">{post.title}</h3>
            <p className="text-slate-600 mb-6 leading-relaxed">{post.content}</p>

            <div className="flex items-center space-x-6 pt-6 border-t border-slate-50">
              <button 
                onClick={() => handleLike(post.id!)}
                className="flex items-center space-x-2 text-slate-400 hover:text-emerald-600 transition-colors group"
              >
                <ThumbsUp className="w-5 h-5 group-active:scale-125 transition-transform" />
                <span className="font-medium">{post.likes}</span>
              </button>
              <button className="flex items-center space-x-2 text-slate-400 hover:text-emerald-600 transition-colors">
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">মন্তব্য</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
