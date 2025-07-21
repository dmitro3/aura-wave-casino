import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { History } from 'lucide-react';

interface RouletteResult {
  id: string;
  round_number: number;
  result_color: string;
  result_slot: number;
  created_at: string;
}

export const RouletteResultHistory = () => {
  const [results, setResults] = useState<RouletteResult[]>([]);

  useEffect(() => {
    fetchResults();

    // Subscribe to new results
    const channel = supabase
      .channel('roulette-results')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'roulette_results' },
        (payload) => {
          console.log('📊 New result:', payload);
          setResults(prev => [payload.new as RouletteResult, ...prev.slice(0, 14)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchResults = async () => {
    const { data } = await supabase
      .from('roulette_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (data) {
      setResults(data);
    }
  };

  const getResultColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500 text-white';
      case 'red': return 'bg-red-500 text-white';
      case 'black': return 'bg-gray-900 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getResultIcon = (color: string) => {
    switch (color) {
      case 'green': return '🟢';
      case 'red': return '🔴';
      case 'black': return '⚫';
      default: return '⚪';
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Last 15 Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {results.map((result) => (
            <Badge
              key={result.id}
              className={`${getResultColorClass(result.result_color)} border-2 border-white/20 px-3 py-2 text-sm font-bold shadow-lg`}
              title={`Round ${result.round_number}: ${result.result_color} (${result.result_slot})`}
            >
              <span className="mr-1">{getResultIcon(result.result_color)}</span>
              {result.result_slot}
            </Badge>
          ))}
          
          {results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground w-full">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results yet</p>
            </div>
          )}
        </div>
        
        {results.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground">
            <p>Most recent results are shown first</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};