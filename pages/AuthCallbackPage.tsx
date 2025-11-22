
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          // Check if account exists
          const { data: accounts } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (!accounts) {
            // Strictly use snake_case keys matching schema
            const { error: insertError } = await supabase
              .from('accounts')
              .insert([{
                user_id: session.user.id,
                account_type: 'freelance',
                email: session.user.email,
                business_name: session.user.user_metadata.full_name || session.user.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);

            if (insertError) {
                console.error("Error creating initial account:", insertError);
            }
          }

          navigate('/select-account');
        } else {
            navigate('/login');
        }
      } catch (error: any) {
        console.error('Callback error:', error);
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">กำลังเข้าสู่ระบบ...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
