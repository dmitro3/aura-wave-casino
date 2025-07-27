import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar, Shield, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProvablyFairModal } from './ProvablyFairModal';
import { supabase } from '@/integrations/supabase/client';

interface ProvablyFairHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoundHistory {
  id: string;
  round_number: number;
  result_slot: number;
  result_color: string;
  server_seed_hash: string;
  nonce: number;
  created_at: string;
  status: string;
  daily_seed_id?: string;
  nonce_id?: number;
}

interface DailySeed {
  id: string;
  date: string;
  server_seed_hash: string;
  lotto_hash: string;
  is_revealed: boolean;
}

export function ProvablyFairHistoryModal({ isOpen, onClose }: ProvablyFairHistoryModalProps) {
  const [rounds, setRounds] = useState<RoundHistory[]>([]);
  const [dailySeeds, setDailySeeds] = useState<DailySeed[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundHistory | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDailySeeds();
      fetchRoundsForDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  const fetchDailySeeds = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_seeds')
        .select('id, date, server_seed_hash, lotto_hash, is_revealed')
        .order('date', { ascending: false })
        .limit(30); // Last 30 days

      if (error) {
        console.error('Error fetching daily seeds:', error);
        return;
      }

      setDailySeeds(data || []);
    } catch (error) {
      console.error('Error fetching daily seeds:', error);
    }
  };

  const fetchRoundsForDate = async (date: string) => {
    setLoading(true);
    try {
      // Find the daily seed for this date
      const { data: dailySeedData, error: seedError } = await supabase
        .from('daily_seeds')
        .select('id')
        .eq('date', date)
        .single();

      if (seedError || !dailySeedData) {
        console.log(`No daily seed found for ${date}`);
        setRounds([]);
        setLoading(false);
        return;
      }

      // Fetch rounds for this daily seed
      const { data, error } = await supabase
        .from('roulette_rounds')
        .select('id, round_number, result_slot, result_color, server_seed_hash, nonce, created_at, status, daily_seed_id, nonce_id')
        .eq('daily_seed_id', dailySeedData.id)
        .eq('status', 'completed')
        .order('nonce_id', { ascending: false })
        .limit(100); // Max 100 rounds per day

      if (error) {
        console.error('Error fetching round history:', error);
        setRounds([]);
      } else {
        setRounds(data || []);
      }
    } catch (error) {
      console.error('Error fetching rounds for date:', error);
      setRounds([]);
    }
    setLoading(false);
  };

  const openRoundDetails = (round: RoundHistory) => {
    setSelectedRound(round);
    setDetailModalOpen(true);
  };

  const getColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-emerald-500';
      case 'red': return 'bg-red-500';
      case 'black': return 'bg-gray-800';
      default: return 'bg-gray-500';
    }
  };

  const getSystemType = (round: RoundHistory) => {
    return round.daily_seed_id ? 'Advanced' : 'Legacy';
  };

  const changeDate = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    const newDate = new Date(currentDate);
    
    if (direction === 'prev') {
      newDate.setDate(currentDate.getDate() - 1);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    
    // Don't go beyond today
    const today = new Date();
    if (newDate <= today) {
      setSelectedDate(newDate.toISOString().split('T')[0]);
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const selectedDailySeed = dailySeeds.find(seed => seed.date === selectedDate);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="glass border-0 max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-emerald-400" />
              Provably Fair History
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Date Selection */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <Label className="text-sm font-medium text-blue-900">Select Date</Label>
                    <p className="text-xs text-blue-700">View games and verify results from any day</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => changeDate('prev')}
                    className="h-8 w-8 p-0 hover:bg-blue-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="h-8 text-sm"
                    />
                    <div className="text-sm font-medium text-blue-900 min-w-0">
                      {formatDateDisplay(selectedDate)}
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => changeDate('next')}
                    disabled={selectedDate >= new Date().toISOString().split('T')[0]}
                    className="h-8 w-8 p-0 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Daily Seed Info */}
              {selectedDailySeed && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Daily Seed Status</span>
                      <Badge variant={selectedDailySeed.is_revealed ? "default" : "secondary"} className="text-xs">
                        {selectedDailySeed.is_revealed ? 'Revealed' : 'Hidden'}
                      </Badge>
                    </div>
                    <div className="text-xs font-mono text-blue-700">
                      Hash: {selectedDailySeed.server_seed_hash.slice(0, 16)}...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Games List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">
                  Games for {formatDateDisplay(selectedDate)}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {rounds.length} rounds
                </Badge>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : rounds.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No games found for {formatDateDisplay(selectedDate)}</p>
                  <p className="text-sm">Try selecting a different date</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">{rounds.map((round) => (
                    <div
                      key={round.id}
                      className="glass border-0 p-4 rounded-lg hover:bg-white/5 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Round Number */}
                          <div className="text-lg font-bold text-emerald-400">
                            #{round.round_number}
                          </div>

                          {/* Result */}
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getColorClass(round.result_color)}`}>
                              {round.result_slot}
                            </div>
                            <span className="text-sm text-muted-foreground capitalize">
                              {round.result_color}
                            </span>
                          </div>

                          {/* System Type */}
                          <Badge variant={getSystemType(round) === 'Advanced' ? 'default' : 'secondary'} className="text-xs">
                            {getSystemType(round)}
                          </Badge>

                          {/* Hash Preview */}
                          <div className="text-xs font-mono text-muted-foreground">
                            {round.server_seed_hash.slice(0, 12)}...
                          </div>

                          {/* Date */}
                          <div className="text-xs text-muted-foreground">
                            {new Date(round.created_at).toLocaleString()}
                          </div>
                        </div>

                        {/* Actions */}
                        <Button
                          onClick={() => openRoundDetails(round)}
                          variant="outline"
                          size="sm"
                          className="glass border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>
                  ))}

                  {rounds.length === 0 && !loading && (
                    <div className="text-center py-8 text-muted-foreground">
                      No completed rounds found
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end pt-4 border-t border-white/10">
              <Button onClick={onClose} variant="outline" className="glass">
                <X className="w-4 h-4 mr-1" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Round Details Modal */}
      <ProvablyFairModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        roundData={selectedRound}
        showCurrentRound={false}
      />
    </>
  );
}