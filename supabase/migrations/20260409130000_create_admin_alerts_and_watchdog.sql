CREATE TABLE public.admin_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    deal_id TEXT,
    alert_type TEXT NOT NULL,
    description TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- Policy to allow admins to select all alerts
CREATE POLICY "Admins can view all alerts"
    ON public.admin_alerts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Policy to allow admins to update alerts (e.g. resolve them)
CREATE POLICY "Admins can update alerts"
    ON public.admin_alerts FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Create a robust checking trigger
CREATE OR REPLACE FUNCTION public.watchdog_message_trigger()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    matched text := '';
BEGIN
    IF NEW.is_system_message = true THEN
        RETURN NEW;
    END IF;

    -- 特定キーワード (LINE, 直接, 手数料)
    IF NEW.content ~ 'LINE|直接|手数料' THEN
        matched := '特定キーワードが含まれています';
    END IF;
    
    -- メールアドレス
    IF NEW.content ~ '[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]+' THEN
        matched := matched || (CASE WHEN matched = '' THEN '' ELSE ', ' END) || 'メールアドレスが含まれています';
    END IF;

    -- 電話番号 (10桁/11桁の数字、またはハイフン区切り)
    IF NEW.content ~ '0[0-9]{1,4}-[0-9]{1,4}-[0-9]{3,4}|0[0-9]{9,10}' THEN
        matched := matched || (CASE WHEN matched = '' THEN '' ELSE ', ' END) || '電話番号が含まれています';
    END IF;

    IF matched != '' THEN
        INSERT INTO public.admin_alerts (
            user_id,
            deal_id,
            alert_type,
            description
        ) VALUES (
            NEW.sender_id,
            NEW.deal_id,
            'keyword_detection',
            matched || ': ' || substring(NEW.content from 1 for 100)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert_watchdog
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION watchdog_message_trigger();
