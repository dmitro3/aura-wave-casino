-- Roulette Security Enhancement Migration
-- This script adds comprehensive security measures to prevent abuse

-- 1. User Rate Limiting Table
CREATE TABLE IF NOT EXISTS user_rate_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_bet_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bet_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Add security columns to roulette_bets table
ALTER TABLE roulette_bets 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS security_hash TEXT;

-- 4. Atomic Balance Check Function
CREATE OR REPLACE FUNCTION atomic_bet_balance_check(
    p_user_id UUID,
    p_bet_amount NUMERIC,
    p_round_id UUID
) RETURNS JSONB AS $$
DECLARE
    current_balance NUMERIC;
    round_status TEXT;
    round_betting_end TIMESTAMPTZ;
    current_time TIMESTAMPTZ := NOW();
BEGIN
    -- Lock the user row to prevent concurrent access
    SELECT balance INTO current_balance
    FROM profiles 
    WHERE id = p_user_id 
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_message', 'User profile not found'
        );
    END IF;
    
    -- Check if user has sufficient balance
    IF current_balance < p_bet_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_message', 'Insufficient balance. Current: $' || current_balance::TEXT
        );
    END IF;
    
    -- Verify round is still in betting phase
    SELECT status, betting_end_time INTO round_status, round_betting_end
    FROM roulette_rounds
    WHERE id = p_round_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_message', 'Round not found'
        );
    END IF;
    
    IF round_status != 'betting' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_message', 'Betting is closed for this round'
        );
    END IF;
    
    IF current_time >= round_betting_end THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_message', 'Betting time has expired'
        );
    END IF;
    
    -- Deduct balance atomically
    UPDATE profiles 
    SET balance = balance - p_bet_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'new_balance', current_balance - p_bet_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Rollback Balance Function
CREATE OR REPLACE FUNCTION rollback_bet_balance(
    p_user_id UUID,
    p_bet_amount NUMERIC
) RETURNS BOOLEAN AS $$
BEGIN
    -- Add the bet amount back to user's balance
    UPDATE profiles 
    SET balance = balance + p_bet_amount,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    IF FOUND THEN
        -- Log the rollback
        INSERT INTO audit_logs (user_id, action, details)
        VALUES (p_user_id, 'balance_rollback', jsonb_build_object(
            'amount', p_bet_amount,
            'reason', 'bet_creation_failed'
        ));
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enhanced Bet Validation Function
CREATE OR REPLACE FUNCTION validate_bet_limits(
    p_user_id UUID,
    p_round_id UUID,
    p_bet_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    total_user_bets NUMERIC := 0;
    bet_count INTEGER := 0;
    max_bet_per_round NUMERIC := 100000;
    max_bets_per_user_per_round INTEGER := 10;
BEGIN
    -- Calculate total bets for this user in this round
    SELECT 
        COALESCE(SUM(bet_amount), 0),
        COUNT(*)
    INTO total_user_bets, bet_count
    FROM roulette_bets
    WHERE user_id = p_user_id AND round_id = p_round_id;
    
    -- Check if adding this bet would exceed limits
    IF total_user_bets + p_bet_amount > max_bet_per_round THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Maximum bet limit per round is $' || max_bet_per_round::TEXT
        );
    END IF;
    
    IF bet_count >= max_bets_per_user_per_round THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Maximum ' || max_bets_per_user_per_round::TEXT || ' bets per round allowed'
        );
    END IF;
    
    RETURN jsonb_build_object(
        'valid', true,
        'current_total', total_user_bets,
        'current_count', bet_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Rate Limiting Check Function
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    last_bet TIMESTAMPTZ;
    current_time TIMESTAMPTZ := NOW();
    min_interval INTERVAL := '1 second';
BEGIN
    SELECT last_bet_time INTO last_bet
    FROM user_rate_limits
    WHERE user_id = p_user_id;
    
    IF FOUND AND (current_time - last_bet) < min_interval THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'wait_time', EXTRACT(EPOCH FROM (last_bet + min_interval - current_time))::INTEGER
        );
    END IF;
    
    RETURN jsonb_build_object('allowed', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_rate_limits_user_id ON user_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_user_round ON roulette_bets(user_id, round_id);
CREATE INDEX IF NOT EXISTS idx_roulette_bets_created_at ON roulette_bets(created_at);

-- 9. Row Level Security Policies
ALTER TABLE user_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit data
CREATE POLICY "Users can view own rate limits" ON user_rate_limits
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only see their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can access all data
CREATE POLICY "Service role full access rate limits" ON user_rate_limits
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access audit logs" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- 10. Trigger for automatic cleanup of old data
CREATE OR REPLACE FUNCTION cleanup_old_security_data() RETURNS void AS $$
BEGIN
    -- Clean up rate limits older than 1 day
    DELETE FROM user_rate_limits 
    WHERE updated_at < NOW() - INTERVAL '1 day';
    
    -- Clean up audit logs older than 30 days
    DELETE FROM audit_logs 
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Add constraints for data integrity
ALTER TABLE user_rate_limits 
ADD CONSTRAINT check_bet_count_positive CHECK (bet_count >= 0);

ALTER TABLE roulette_bets 
ADD CONSTRAINT check_bet_amount_positive CHECK (bet_amount > 0),
ADD CONSTRAINT check_bet_amount_reasonable CHECK (bet_amount >= 0.01 AND bet_amount <= 1000000);

-- 12. Function to get user betting statistics
CREATE OR REPLACE FUNCTION get_user_bet_stats(
    p_user_id UUID,
    p_round_id UUID
) RETURNS JSONB AS $$
DECLARE
    total_amount NUMERIC := 0;
    bet_count INTEGER := 0;
    last_bet_time TIMESTAMPTZ;
BEGIN
    SELECT 
        COALESCE(SUM(bet_amount), 0),
        COUNT(*),
        MAX(created_at)
    INTO total_amount, bet_count, last_bet_time
    FROM roulette_bets
    WHERE user_id = p_user_id AND round_id = p_round_id;
    
    RETURN jsonb_build_object(
        'total_amount', total_amount,
        'bet_count', bet_count,
        'last_bet_time', last_bet_time,
        'can_bet_more', (total_amount < 100000 AND bet_count < 10)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;