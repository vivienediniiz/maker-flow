-- Corrigido: usar 'id' em vez de 'user_id' em profiles

UPDATE profiles 
SET 
  subscription_tier = 'free',
  subscription_status = 'inactive',
  trial_ends_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'rodrigomes.rga@gmail.com');
