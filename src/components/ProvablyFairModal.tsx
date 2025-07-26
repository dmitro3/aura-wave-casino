import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Eye, Calculator, Dice6 } from 'lucide-react';

interface RoundData {
  id: string;
  round_number: number;
  result_slot: number;
  result_color: string;
  result_multiplier: number;
  server_seed_hash: string;
  nonce: number;
  reel_position: number;
  created_at: string;
}

interface UserBet {
  bet_color: string;
  bet_amount: number;
  potential_payout: number;
  actual_payout: number;
  is_winner: boolean;
  profit: number;
}

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  roundData?: RoundData | null;
  showCurrentRound?: boolean;
}

// Roulette wheel configuration (same as RouletteReel)
const WHEEL_SLOTS = [
  { slot: 0, color: 'green', multiplier: '14x' },
  { slot: 11, color: 'black', multiplier: '2x' },
  { slot: 5, color: 'red', multiplier: '2x' },
  { slot: 10, color: 'black', multiplier: '2x' },
  { slot: 6, color: 'red', multiplier: '2x' },
  { slot: 9, color: 'black', multiplier: '2x' },
  { slot: 7, color: 'red', multiplier: '2x' },
  { slot: 8, color: 'black', multiplier: '2x' },
  { slot: 1, color: 'red', multiplier: '2x' },
  { slot: 14, color: 'black', multiplier: '2x' },
  { slot: 2, color: 'red', multiplier: '2x' },
  { slot: 13, color: 'black', multiplier: '2x' },
  { slot: 3, color: 'red', multiplier: '2x' },
  { slot: 12, color: 'black', multiplier: '2x' },
  { slot: 4, color: 'red', multiplier: '2x' }
];

export function ProvablyFairModal({ isOpen, onClose, roundData, showCurrentRound = false }: ProvablyFairModalProps) {
  const { user } = useAuth();
  const [verificationData, setVerificationData] = useState<any>(null);
  const [userBets, setUserBets] = useState<UserBet[]>([]);
  const [clientSeed, setClientSeed] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && roundData) {
      console.log('🔍 Modal opened with round data:', roundData);
      fetchRoundDetails();
    }
  }, [isOpen, roundData]);

  const fetchRoundDetails = async () => {
    if (!roundData || !user) return;

    setLoading(true);
    try {
      console.log('🔍 Fetching round details for:', roundData.id);
      
      // Fetch verification data
      const { data: verification, error: verificationError } = await supabase.functions.invoke('roulette-engine', {
        body: {
          action: 'verify_round',
          roundId: roundData.id
        }
      });

      if (verificationError) {
        console.error('❌ Verification error:', verificationError);
        throw verificationError;
      }

      console.log('✅ Verification data received:', verification);

      if (verification) {
        setVerificationData(verification);
        setClientSeed(verification.client_seed || 'default_client_seed');
      }

      // Fetch user's bets for this round
      const { data: bets, error: betsError } = await supabase
        .from('roulette_bets')
        .select('bet_color, bet_amount, potential_payout, actual_payout, is_winner, profit')
        .eq('round_id', roundData.id)
        .eq('user_id', user.id);

      if (betsError) {
        console.error('❌ Bets error:', betsError);
      } else {
        console.log('✅ User bets:', bets);
        setUserBets(bets || []);
      }

    } catch (error: any) {
      console.error('❌ Error fetching round details:', error);
      // Set a basic verification data even on error
      setVerificationData({
        round_id: roundData.id,
        round_number: roundData.round_number,
        error: error.message || 'Failed to load round details'
      });
    }
    setLoading(false);
  };

  const verifyFairness = async () => {
    if (!verificationData) return;

    setIsVerifying(true);
    try {
      console.log('🔍 Calculating provably fair verification');
      
      const { data, error } = await supabase.functions.invoke('roulette-engine', {
        body: {
          action: 'verify_round',
          roundId: roundData?.id
        }
      });

      if (error) {
        console.error('❌ Verification API error:', error);
        throw error;
      }

      console.log('✅ Verification result:', data);

      if (data) {
        setVerificationData(data);
      }
    } catch (error) {
      console.error('❌ Error verifying fairness:', error);
    }
    setIsVerifying(false);
  };

  const getTileColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white';
      case 'red': return 'bg-gradient-to-br from-red-500 to-red-700 text-white';
      case 'black': return 'bg-gradient-to-br from-gray-800 to-gray-900 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const renderReelVisualization = () => {
    if (!roundData) return null;

    const winningSlotIndex = WHEEL_SLOTS.findIndex(slot => slot.slot === roundData.result_slot);
    const visibleSlots = [];
    
    // Show 5 slots centered around the winning slot
    for (let i = -2; i <= 2; i++) {
      const index = (winningSlotIndex + i + WHEEL_SLOTS.length) % WHEEL_SLOTS.length;
      visibleSlots.push({ ...WHEEL_SLOTS[index], position: i });
    }

    return (
      <div className="relative">
        <div className="flex items-center justify-center space-x-1 p-4 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-lg">
          {visibleSlots.map((slot, index) => (
            <div
              key={index}
              className={`w-20 h-16 flex flex-col items-center justify-center border-2 border-gray-600 rounded-lg transition-all duration-300 ${
                slot.position === 0 
                  ? `${getTileColorClass(slot.color)} scale-110 ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50 z-10`
                  : `${getTileColorClass(slot.color)} opacity-70`
              }`}
            >
              <span className="text-lg font-bold">{slot.slot}</span>
              <span className="text-xs">{slot.multiplier}</span>
            </div>
          ))}
        </div>
        
        {/* Center line indicator */}
        <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-yellow-500 transform -translate-x-1/2 pointer-events-none">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-yellow-500"></div>
          </div>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-yellow-500"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {showCurrentRound ? 'Current Round - Provably Fair' : `Round #${roundData?.round_number} - Details`}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Round Result Visualization */}
            {roundData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Round Result
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <Badge variant="outline" className="mb-2">
                        Round #{roundData.round_number}
                      </Badge>
                      <div className="text-2xl font-bold">
                        Result: <span className={`${roundData.result_color === 'green' ? 'text-emerald-400' : roundData.result_color === 'red' ? 'text-red-400' : 'text-gray-300'}`}>
                          {roundData.result_color.toUpperCase()} {roundData.result_slot}
                        </span>
                      </div>
                    </div>
                    
                    {renderReelVisualization()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User's Bets */}
            {userBets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dice6 className="w-4 h-4" />
                    Your Bets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {userBets.map((bet, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                        <div className="flex items-center gap-2">
                          <Badge className={`${bet.bet_color === 'green' ? 'bg-emerald-500' : bet.bet_color === 'red' ? 'bg-red-500' : 'bg-gray-700'}`}>
                            {bet.bet_color.toUpperCase()}
                          </Badge>
                          <span>Bet: ${bet.bet_amount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={bet.is_winner ? 'default' : 'destructive'}>
                            {bet.is_winner ? 'WON' : 'LOST'}
                          </Badge>
                          <span className={bet.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                            {bet.profit >= 0 ? '+' : ''}${bet.profit.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {verificationData?.error && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-red-500">
                    <h4 className="font-semibold mb-2">Error Loading Round Details</h4>
                    <p className="text-sm">{verificationData.error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Provably Fair Verification */}
            {verificationData && !verificationData.error && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Provably Fair Verification
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {verificationData.is_completed === false && (
                    <div className="p-4 rounded-lg border bg-yellow-50">
                      <p className="text-sm text-yellow-800">
                        🕐 This round is still ongoing. Server seed will be revealed when the round completes.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Server Seed Hash</Label>
                      <Input value={verificationData.server_seed_hash || 'N/A'} readOnly className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label>Server Seed (Revealed)</Label>
                      <Input 
                        value={verificationData.server_seed || 'Not revealed yet'} 
                        readOnly 
                        className="font-mono text-xs" 
                      />
                    </div>
                    <div>
                      <Label>Lotto Hash</Label>
                      <Input value={verificationData.lotto_hash || 'N/A'} readOnly className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label>Lotto (Revealed)</Label>
                      <Input 
                        value={verificationData.lotto || 'Not revealed yet'} 
                        readOnly 
                        className="font-mono text-xs" 
                      />
                    </div>
                    <div>
                      <Label>Round ID (Nonce)</Label>
                      <Input value={verificationData.nonce_id || 'N/A'} readOnly className="font-mono text-xs" />
                    </div>
                    <div>
                      <Label>Daily Date</Label>
                      <Input value={verificationData.daily_date || 'N/A'} readOnly className="font-mono text-xs" />
                    </div>
                  </div>

                  {verificationData.is_completed && !verificationData.verification_result && (
                    <Button onClick={verifyFairness} disabled={isVerifying} className="w-full">
                      {isVerifying ? 'Calculating...' : 'Calculate Provably Fair Verification'}
                    </Button>
                  )}

                  {verificationData.verification_result && (
                    <div className="p-4 rounded-lg border bg-muted">
                      <h4 className="font-semibold mb-2">Provably Fair Verification Result:</h4>
                      <p className="text-sm mb-2">
                        <strong>Formula:</strong> <code className="bg-background px-1 rounded">{verificationData.provably_fair_formula}</code>
                      </p>
                      <p className="text-sm">
                        Hash Input: <code className="bg-background px-1 rounded">{verificationData.hash_input}</code>
                      </p>
                      <p className="text-sm">
                        SHA-256 Hash: <code className="bg-background px-1 rounded">{verificationData.hash_result}</code>
                      </p>
                      <p className="text-sm">
                        Result Calculation: {verificationData.hash_number} % 15 = {verificationData.calculated_slot}
                      </p>
                      <p className="text-sm">
                        Wheel Position {verificationData.calculated_slot} → Slot {verificationData.actual_calculated_slot || verificationData.calculated_slot}
                      </p>
                      <p className={`text-sm font-semibold ${verificationData.verification_result === 'VALID' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {verificationData.verification_result === 'VALID' ? '✅' : '❌'} Result: Slot {verificationData.result_slot} ({verificationData.result_color}) - {verificationData.verification_result}
                      </p>
                      <div className="mt-3 text-xs text-muted-foreground">
                        <p>🛡️ Advanced provably fair cryptographic verification</p>
                        <p>📅 Daily seed and lotto are generated every 24 hours</p>
                        <p>🔒 Results are predetermined and cannot be manipulated</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}