
import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface GameHistoryRecord {
  id: string
  user_id: string
  game_type: string
  bet_amount: number
  result: string
  profit: number
  game_data: any
  created_at: string
}

export function useGameHistory(gameType?: string, limit = 10) {
  const { user } = useAuth()
  const [history, setHistory] = useState<GameHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setHistory([])
      setLoading(false)
      return
    }

    fetchGameHistory()
  }, [user, gameType, limit])

  const fetchGameHistory = async () => {
    if (!user) return

    try {
      let query = supabase
        .from('game_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (gameType) {
        query = query.eq('game_type', gameType)
      }

      const { data, error } = await query

      if (error) throw error

      setHistory(data || [])
    } catch (error) {
      console.error('Error fetching game history:', error)
    } finally {
      setLoading(false)
    }
  }

  const addGameRecord = async (record: Omit<GameHistoryRecord, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('game_history')
        .insert({
          user_id: user.id,
          ...record,
        })

      if (error) throw error

      // Refresh history
      await fetchGameHistory()
    } catch (error) {
      console.error('Error adding game record:', error)
      throw error
    }
  }

  return {
    history,
    loading,
    addGameRecord,
    refetch: fetchGameHistory,
  }
}
