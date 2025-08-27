import { createClient } from './supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Install uuid package if not already installed
// npm install uuid @types/uuid

const SESSION_KEY = 'anonymous_session_id';

export async function getOrCreateSession() {
  const supabase = createClient();
  
  // Try to get existing session from localStorage
  let sessionId = localStorage.getItem(SESSION_KEY);
  
  if (!sessionId) {
    // Generate a new session ID
    sessionId = uuidv4();
    localStorage.setItem(SESSION_KEY, sessionId);
    
    // Create a new anonymous user in the database
    const { error } = await supabase
      .from('anonymous_users')
      .insert({ session_id: sessionId })
      .single();
      
    if (error) {
      console.error('Error creating anonymous user:', error);
      return null;
    }
  }
  
  // Get the anonymous user ID from the database
  const { data: user, error } = await supabase
    .from('anonymous_users')
    .select('id')
    .eq('session_id', sessionId)
    .single();
    
  if (error) {
    console.error('Error fetching anonymous user:', error);
    return null;
  }
  
  // Update last_seen_at timestamp
  await supabase
    .from('anonymous_users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', user.id);
  
  return user.id;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
