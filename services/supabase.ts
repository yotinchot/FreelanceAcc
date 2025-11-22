
import { createClient } from '@supabase/supabase-js';

// Configuration for Supabase
// Using hardcoded values for this setup to ensure client-side compatibility
const supabaseUrl = "https://fcuvgflzmyjetxhgdnsg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjdXZnZmx6bXlqZXR4aGdkbnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDg3MDEsImV4cCI6MjA3OTI4NDcwMX0.QjHYCNHlT79wr5lo7r1TB_d3vEXd3o3ujmAzWs11ucU";

// Initialize the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
