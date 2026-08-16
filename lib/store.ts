import { supabase } from './supabase';

export interface Charity {
  id: string;
  name: string;
  description: string;
}

export const store = {
  init() {},

  getCharities(): Charity[] {
    return [
      { id: 'charity-1', name: 'Hatzolah', description: 'Emergency medical services' },
      { id: 'charity-2', name: 'Masbia', description: 'Soup kitchen network' },
      { id: 'charity-3', name: 'Chai Lifeline', description: 'Supporting sick children' },
      { id: 'charity-4', name: 'Tomchei Shabbos', description: 'Shabbos food packages' },
      { id: 'charity-5', name: 'Bikur Cholim', description: 'Supporting the sick' },
    ];
  },

  getStats() {
    return {
      activeChallenges: 42,
      totalRaised: 125000,
      maxStreak: 40,
      ripples: 18,
    };
  },

  async createChallenge(data: any) {
    const customId = Math.random().toString(36).substring(2, 11);

    const payload = {
      id: customId,
      title: data.customName || data.curatedKey || 'New Challenge',
      description: data.customDescription || data.personalNote || '',
      goal_amount: Number(data.goalAmountCents ? data.goalAmountCents / 100 : 0),
      charity_name: data.charityId || 'General Charity',
      creator_name: data.userId || 'Anonymous',
      raised_amount: 0,
    };

    const { error } = await supabase.from('challenges').insert([payload]);
    if (error) console.error('Supabase save error:', error);

    return {
      ...data,
      id: customId,
      currentStreak: 0,
      daysCompleted: 0,
      totalRaisedCents: 0,
      status: 'active',
    };
  },

  async getChallengeById(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      customName: data.title,
      customDescription: data.description,
      durationDays: 30,
      goalAmountCents: (data.goal_amount || 0) * 100,
      totalRaisedCents: (data.raised_amount || 0) * 100,
      status: 'active',
      currentStreak: 1,
      daysCompleted: 1,
      createdAt: data.created_at || new Date().toISOString(),
    };
  },
};
