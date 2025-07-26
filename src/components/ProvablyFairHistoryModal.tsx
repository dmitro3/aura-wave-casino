import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Shield, Eye, X } from 'lucide-react';
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

export function ProvablyFairHistoryModal({ isOpen, onClose }: ProvablyFairHistoryModalProps) {
  const [rounds, setRounds] = useState<RoundHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundHistory | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRoundHistory();
    }
  }, [isOpen]);

  const fetchRoundHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('roulette_rounds')
        .select('id, round_number, result_slot, result_color, server_seed_hash, nonce, created_at, status, daily_seed_id, nonce_id')
        .eq('status', 'completed')
        .order('round_number', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching round history:', error);
        return;
      }

      setRounds(data || []);
    } catch (error) {
      console.error('Error fetching round history:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="glass border-0 max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-emerald-400" />
              Provably Fair History - Last 50 Rounds
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {rounds.map((round) => (
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