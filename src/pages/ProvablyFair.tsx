import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  ArrowLeft, 
  Lock, 
  Hash, 
  Clock, 
  Calculator, 
  Eye, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export function ProvablyFair() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <Link to="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Games
            </Button>
          </Link>
          
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Shield className="w-12 h-12 text-emerald-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Provably Fair Gaming
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Complete transparency through cryptographic verification. Every game result is predetermined, 
              verifiable, and impossible to manipulate.
            </p>
            <Badge variant="outline" className="text-emerald-400 border-emerald-400">
              🛡️ Cryptographically Secure
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* How It Works */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-400" />
                How Provably Fair Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-emerald-400 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-400">Daily Seed Generation</h4>
                    <p className="text-sm text-muted-foreground">
                      Every 24 hours, we generate a new server seed (64 characters) and lotto number (10 digits). 
                      These are immediately hashed with SHA-256 and published.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-400 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-400">Result Pre-calculation</h4>
                    <p className="text-sm text-muted-foreground">
                      Before any bets are placed, each round's result is calculated using: 
                      <code className="bg-muted px-1 rounded text-xs ml-1">
                        hash(server_seed + "-" + lotto + "-" + round_number)
                      </code>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-orange-400 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-400">Cryptographic Proof</h4>
                    <p className="text-sm text-muted-foreground">
                      The SHA-256 hash creates an irreversible mathematical proof. The first 8 characters 
                      are converted to a number, then modulo 15 gives the final result (0-14).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-purple-400 font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-400">Public Verification</h4>
                    <p className="text-sm text-muted-foreground">
                      After each round, the server seed is revealed. Anyone can verify the result 
                      using the same mathematical formula.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Why Trust It */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                Why You Can Trust It
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Predetermined Results</h4>
                  <p className="text-sm text-muted-foreground">
                    Results are calculated before any bets are placed, making manipulation impossible.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Open Source Math</h4>
                  <p className="text-sm text-muted-foreground">
                    The verification formula is public and can be tested by anyone with basic programming knowledge.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Cryptographic Security</h4>
                  <p className="text-sm text-muted-foreground">
                    SHA-256 is the same encryption used by Bitcoin and banks worldwide.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Daily Seed Rotation</h4>
                  <p className="text-sm text-muted-foreground">
                    Fresh seeds every 24 hours ensure maximum randomness and security.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mt-6">
                <h4 className="font-semibold text-emerald-400 flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4" />
                  Instant Verification
                </h4>
                <p className="text-sm text-muted-foreground">
                  Click the shield icon (🛡️) on any game or the result history to see the mathematical 
                  proof for any round. No trust required - verify everything yourself!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How to Verify */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-orange-400" />
                How to Verify Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-3">
                <h4 className="font-semibold">Step 1: Access Verification</h4>
                <p className="text-sm text-muted-foreground">
                  Click the shield icon (🛡️) in any game or click on any result in the history.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Step 2: Check the Data</h4>
                <p className="text-sm text-muted-foreground">
                  You'll see the server seed, lotto number, round ID, and the SHA-256 hash.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Step 3: Verify Manually (Optional)</h4>
                <div className="bg-muted/50 rounded-lg p-3">
                  <code className="text-xs block text-muted-foreground">
                    // JavaScript verification example<br />
                    const input = `$&#123;serverSeed&#125;-$&#123;lotto&#125;-$&#123;roundId&#125;`;<br />
                    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));<br />
                    const result = parseInt(hashHex.substring(0, 8), 16) % 15;
                  </code>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Step 4: Compare Results</h4>
                <p className="text-sm text-muted-foreground">
                  The calculated result should match the actual game result. If they match, 
                  the round was provably fair!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Daily Seeds Info */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Daily Seed System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-3">
                <h4 className="font-semibold">24-Hour Cycles</h4>
                <p className="text-sm text-muted-foreground">
                  Every day at midnight UTC, new server seeds and lotto numbers are generated 
                  for maximum randomness and security.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Immediate Commitment</h4>
                <p className="text-sm text-muted-foreground">
                  The moment new seeds are generated, their SHA-256 hashes are published. 
                  This proves the seeds existed before any games were played.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Public Revelation</h4>
                <p className="text-sm text-muted-foreground">
                  After 24 hours, the actual seeds are revealed so players can verify 
                  all games from that day.
                </p>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-purple-400 text-sm">Immutable Security</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Once a seed is published (hashed), it cannot be changed without breaking 
                      the cryptographic proof. This guarantees fairness.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Experience Provably Fair Gaming?</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Every spin, every bet, every result - completely transparent and verifiable. 
              Join thousands of players who trust our cryptographically secure platform.
            </p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out">
                Start Playing Now
                <Shield className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}