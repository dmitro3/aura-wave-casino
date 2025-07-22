import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MessageCircle, Crown, Shield, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import ClickableUsername from '@/components/ClickableUsername';
import { ProfileBorder } from '@/components/ProfileBorder';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  message: string;
  user_level: number;
  created_at: string;
}

export const RealtimeChat = () => {
  const { user } = useAuth();
  const { userData } = useUserProfile();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load initial messages
    loadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg]);
          // Auto scroll after a slight delay to ensure DOM is updated
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages' as any)
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages((data as unknown as ChatMessage[]) || []);
      setTimeout(scrollToBottom, 100);
    } catch (error: any) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !userData || loading) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('chat_messages' as any)
        .insert({
          user_id: user.id,
          username: userData.username,
          message: newMessage.trim(),
          user_level: userData.current_level
        });

      if (error) throw error;
      
      setNewMessage('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserBadge = (level: number) => {
    if (level >= 50) return { icon: Crown, color: 'text-yellow-400', label: 'VIP' };
    if (level >= 25) return { icon: Shield, color: 'text-purple-400', label: 'Elite' };
    if (level >= 10) return { icon: Star, color: 'text-blue-400', label: 'Pro' };
    return null;
  };

  return (
    <Card className="w-full h-full glass border-0 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span>Live Chat</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {messages.length} messages
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 h-full flex flex-col">
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
          <div className="space-y-3 pb-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const badge = getUserBadge(msg.user_level);
                const isOwnMessage = msg.user_id === user?.id;
                
                return (
                  <div key={msg.id} className={`flex gap-3 animate-fade-in ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                    <ProfileBorder level={msg.user_level} size="sm">
                      <Avatar className="w-full h-full">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                          {msg.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </ProfileBorder>
                    
                    <div className={`flex-1 min-w-0 ${isOwnMessage ? 'text-right' : ''}`}>
                       <div className={`flex items-center gap-2 mb-1 ${isOwnMessage ? 'justify-end' : ''}`}>
                         <ClickableUsername 
                           username={msg.username}
                           className={`font-medium text-sm ${isOwnMessage ? 'text-primary' : ''}`}
                         />
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          LVL {msg.user_level}
                        </Badge>
                        {badge && (
                          <div className={`flex items-center gap-1 text-xs ${badge.color}`}>
                            <badge.icon className="w-3 h-3" />
                            <span>{badge.label}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className={`p-2 rounded-lg text-sm break-words max-w-xs ${
                        isOwnMessage 
                          ? 'bg-primary/20 border border-primary/30 ml-auto' 
                          : 'bg-card/50 border'
                      }`}>
                        {msg.message}
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={user ? "Type a message..." : "Sign in to chat"}
              disabled={!user || loading}
              className="flex-1 glass border-0"
              maxLength={200}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !user || loading}
              className="glass border-0 hover:glow-primary"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {!user && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Please sign in to participate in chat
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};