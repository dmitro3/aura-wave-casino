
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<any>
  signIn: (email: string, password: string) => Promise<any>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Memoized session update function to prevent unnecessary re-renders
  const updateSession = useCallback((newSession: Session | null) => {
    setSession(newSession)
    setUser(newSession?.user ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    let mounted = true

    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          updateSession(session)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    // Listen for auth changes with debouncing
    let authChangeTimeout: NodeJS.Timeout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Clear previous timeout to debounce rapid changes
      clearTimeout(authChangeTimeout)
      
      authChangeTimeout = setTimeout(() => {
        if (mounted) {
          updateSession(session)
        }
      }, 50) // Small debounce to prevent rapid state changes
    })

    // Get initial session
    getInitialSession()

    return () => {
      mounted = false
      clearTimeout(authChangeTimeout)
      subscription.unsubscribe()
    }
  }, [updateSession])

  const signUp = async (email: string, password: string, username: string) => {
    const redirectUrl = `${window.location.origin}/`
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
        },
      },
    })

    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
