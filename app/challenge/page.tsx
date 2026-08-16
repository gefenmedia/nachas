'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ChallengeContent() {
  const searchParams = useSearchParams();
  const challengeId = searchParams.get('id');

  const [challenge, setChallenge] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!challengeId) {
      setLoading(false);
      return;
    }

    async function fetchChallengeData() {
      // Fetch challenge details from Supabase
      const { data: challengeData } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (challengeData) setChallenge(challengeData);

      // Fetch comments for this challenge
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false });

      if (commentsData) setComments(commentsData);

      setLoading(false);
    }

    fetchChallengeData();
  }, [challengeId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !challengeId) return;

    const nameToUse = userName.trim() || 'Anonymous';

    const { data } = await supabase
      .from('comments')
      .insert([{ challenge_id: challengeId, user_name: nameToUse, content: newComment }])
      .select();

    if (data) {
      setComments([data[0], ...comments]);
      setNewComment('');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-white">Loading challenge data...</div>;
  }

  if (!challenge) {
    return (
      <div className="max-w-md mx-auto text-center py-12 px-4 text-white">
        <h1 className="text-2xl font-bold mb-2">Challenge Not Found</h1>
        <p className="text-gray-400 mb-6">This challenge link may be invalid or expired.</p>
        <a href="/" className="bg-yellow-500 text-black px-6 py-3 rounded-full font-semibold">
          Create a New Challenge
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 text-white min-h-screen">
      {/* Challenge Card Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
        <span className="text-xs font-bold tracking-wider text-yellow-500 uppercase">
          {challenge.charity_name || 'Charity Drive'}
        </span>
        <h1 className="text-2xl font-bold mt-1 mb-2">{challenge.title}</h1>
        <p className="text-gray-300 text-sm mb-4">{challenge.description}</p>
        
        <div className="bg-slate-800 p-4 rounded-xl flex justify-between items-center mb-6">
          <div>
            <p className="text-xs text-gray-400">Raised</p>
            <p className="text-xl font-bold text-green-400">${challenge.raised_amount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Goal</p>
            <p className="text-xl font-bold">${challenge.goal_amount}</p>
          </div>
        </div>

        <button className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl shadow-lg transition-transform active:scale-95">
          Sponsor This Challenge
        </button>
      </div>

      {/* Comments Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold mb-4">Community Comments</h2>

        <form onSubmit={handleAddComment} className="mb-6 space-y-3">
          <input
            type="text"
            placeholder="Your Name (optional)"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
          />
          <textarea
            placeholder="Leave a message of encouragement..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
            rows={3}
          />
          <button
            type="submit"
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-sm transition"
          >
            Post Comment
          </button>
        </form>

        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-xs text-gray-500 text-center">No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                <p className="text-xs font-semibold text-yellow-400">{c.user_name}</p>
                <p className="text-sm text-gray-200 mt-0.5">{c.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChallengePage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-white">Loading...</div>}>
      <ChallengeContent />
    </Suspense>
  );
}
