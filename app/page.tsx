'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [charityName, setCharityName] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !goalAmount) {
      alert('Please fill out the challenge title and goal amount.');
      return;
    }

    setIsSubmitting(true);

    // Generate a unique ID for the share link
    const customId = Math.random().toString(36).substring(2, 11);

    // Save directly to your Supabase cloud database
    const { error } = await supabase.from('challenges').insert([
      {
        id: customId,
        title,
        description,
        goal_amount: Number(goalAmount),
        charity_name: charityName || 'General Charity',
        creator_name: creatorName || 'Anonymous',
        raised_amount: 0,
      },
    ]);

    if (error) {
      console.error(error);
      alert('Failed to save challenge to cloud. Please try again.');
      setIsSubmitting(false);
      return;
    }

    // Redirect directly to the newly created share link
    window.location.href = `/challenge/?id=${customId}`;
  };

  return (
    <main className="max-w-md mx-auto px-4 py-8 min-h-screen text-white">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-yellow-500 mb-2">NACHAS</h1>
        <p className="text-gray-300 text-sm">Turn Your Personal Growth Into Real Charity</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Create Your Challenge</h2>
        
        <form onSubmit={handleCreateChallenge} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Your Name</label>
            <input
              type="text"
              placeholder="e.g. Daniel"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Challenge Title *</label>
            <input
              type="text"
              placeholder="e.g. Daily Study & Exercise Challenge"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <textarea
              placeholder="What are you taking on, and why are you raising funds?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Charity Name</label>
            <input
              type="text"
              placeholder="e.g. Local Food Bank"
              value={charityName}
              onChange={(e) => setCharityName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Fundraising Goal ($) *</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-yellow-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 mt-4"
          >
            {isSubmitting ? 'Saving to Cloud...' : 'Create & Share Challenge'}
          </button>
        </form>
      </div>
    </main>
  );
}
