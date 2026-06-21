import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://gbfhhtgdgmqwjxjmnlbw.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key-here"; // Get from Supabase dashboard > Settings > API

// For production, use environment variables
// const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface Trade {
  id?: string;
  trade_id: string;
  date: string;
  symbol: string;
  session: 'Asian' | 'London' | 'New York';
  direction: 'Long' | 'Short';
  entry: number;
  lot_size: number;
  profit: number;
  result: 'Win' | 'Loss';
  notes?: string;
  screenshot_url?: string;
  created_at?: string;
}

export interface Journal {
  id?: string;
  date: string;
  user_id: string;
  mood: 'excellent' | 'good' | 'neutral' | 'bad' | 'terrible';
  content: string;
  lesson_learned: string;
  goals_tomorrow: string;
  dayScreenshots?: string[];
  created_at?: string;
}

export interface Screenshot {
  id: string;
  trade_id?: string;
  date: string;
  user_id: string;
  url: string;
  type: 'trade' | 'daily';
  created_at: string;
}

class SupabaseService {
  private static instance: SupabaseService;
  private supabase: SupabaseClient;

  private constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  // Trades
  async saveTrade(trade: Trade): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('trades')
        .upsert(trade, { onConflict: 'trade_id' });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving trade:', error);
      return false;
    }
  }

  async getTrades(startDate?: string, endDate?: string): Promise<Trade[]> {
    try {
      let query = this.supabase
        .from('trades')
        .select('*')
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trades:', error);
      return [];
    }
  }

  async updateTradeNote(tradeId: string, note: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('trades')
        .update({ notes: note })
        .eq('trade_id', tradeId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating trade note:', error);
      return false;
    }
  }

  // Journals
  async saveJournal(journal: Journal): Promise<boolean> {
    try {
      // Ensure date format
      const journalToSave = {
        ...journal,
        id: journal.id || `journal-${journal.date}-${journal.user_id}`,
      };

      const { error } = await this.supabase
        .from('daily_journals')
        .upsert(journalToSave, { onConflict: 'date,user_id' });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving journal:', error);
      return false;
    }
  }

  async getJournals(userId: string, startDate?: string): Promise<Journal[]> {
    try {
      let query = this.supabase
        .from('daily_journals')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (startDate) {
        query = query.gte('date', startDate);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching journals:', error);
      return [];
    }
  }

  async getJournalByDate(date: string, userId: string): Promise<Journal | null> {
    try {
      const { data, error } = await this.supabase
        .from('daily_journals')
        .select('*')
        .eq('date', date)
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return data;
    } catch (error) {
      console.error('Error fetching journal by date:', error);
      return null;
    }
  }

  // Screenshots
  async saveScreenshot(screenshot: Omit<Screenshot, 'id' | 'created_at'>): Promise<string | null> {
    try {
      const screenshotToSave = {
        ...screenshot,
        id: `screenshot-${Date.now()}`,
      };

      const { data, error } = await this.supabase
        .from('screenshots')
        .insert(screenshotToSave)
        .select()
        .single();
      
      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving screenshot:', error);
      return null;
    }
  }

  async getScreenshots(date: string, userId: string, type?: 'trade' | 'daily'): Promise<Screenshot[]> {
    try {
      let query = this.supabase
        .from('screenshots')
        .select('*')
        .eq('date', date)
        .eq('user_id', userId);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching screenshots:', error);
      return [];
    }
  }

  // Upload image to storage
  async uploadImage(file: File, path: string): Promise<string | null> {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${path}/${fileName}`;

      const { data, error } = await this.supabase.storage
        .from('trading-journal')
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('trading-journal')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  // Get monthly statistics
  async getMonthlyStats(userId: string, year: number, month: number): Promise<any> {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      // Get trades for the month
      const trades = await this.getTrades(startDate, endDate);
      
      // Get journals for the month
      const journals = await this.getJournals(userId, startDate);

      const totalPnL = trades.reduce((sum, t) => sum + t.profit, 0);
      const winningTrades = trades.filter(t => t.profit > 0).length;
      const losingTrades = trades.filter(t => t.profit < 0).length;
      const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

      // Group by day
      const tradesByDay: Record<string, Trade[]> = {};
      trades.forEach(trade => {
        const date = trade.date.split('T')[0];
        if (!tradesByDay[date]) tradesByDay[date] = [];
        tradesByDay[date].push(trade);
      });

      return {
        totalPnL,
        totalTrades: trades.length,
        winningTrades,
        losingTrades,
        winRate,
        journalDays: journals.length,
        tradesByDay,
        journals
      };
    } catch (error) {
      console.error('Error getting monthly stats:', error);
      return null;
    }
  }
}

export default SupabaseService.getInstance();
