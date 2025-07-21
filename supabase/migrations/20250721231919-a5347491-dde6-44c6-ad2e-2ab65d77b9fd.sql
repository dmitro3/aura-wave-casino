-- Check current triggers and recreate properly
DO $$
BEGIN
    -- Drop all existing triggers on tips table to start clean
    DROP TRIGGER IF EXISTS after_tip_insert ON public.tips;
    DROP TRIGGER IF EXISTS create_tip_notifications_trigger ON public.tips;
    DROP TRIGGER IF EXISTS tips_notification_trigger ON public.tips;
    
    -- Recreate the trigger with a specific name
    CREATE TRIGGER tips_after_insert_notification
        AFTER INSERT ON public.tips
        FOR EACH ROW
        EXECUTE FUNCTION public.create_tip_notifications();
        
    RAISE NOTICE 'Trigger recreated successfully';
END
$$;