import { supabase } from '@/integrations/supabase/client';

/**
 * Refreshes the user's balance from the database before bet validation
 * This ensures the balance is up-to-date when users try to place bets
 */
export const refreshUserBalance = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error refreshing balance:', error);
      throw error;
    }

    const balance = data.balance || 0;
    console.log('💰 Balance refreshed from database:', balance);
    return balance;
  } catch (error) {
    console.error('Failed to refresh balance:', error);
    throw error;
  }
};

/**
 * Validates if a user has sufficient balance for a bet
 * Optionally refreshes balance from database first
 */
export const validateBalanceForBet = async (
  userId: string, 
  betAmount: number, 
  currentBalance: number,
  refreshFirst: boolean = true
): Promise<{ isValid: boolean; currentBalance: number; error?: string }> => {
  try {
    let balanceToCheck = currentBalance;
    
    // Optionally refresh balance from database first
    if (refreshFirst) {
      balanceToCheck = await refreshUserBalance(userId);
    }
    
    if (betAmount > balanceToCheck) {
      return {
        isValid: false,
        currentBalance: balanceToCheck,
        error: `Insufficient balance. You have $${balanceToCheck.toFixed(2)} but need $${betAmount.toFixed(2)}`
      };
    }
    
    return {
      isValid: true,
      currentBalance: balanceToCheck
    };
  } catch (error) {
    console.error('Balance validation failed:', error);
    return {
      isValid: false,
      currentBalance: currentBalance,
      error: 'Failed to validate balance. Please try again.'
    };
  }
};