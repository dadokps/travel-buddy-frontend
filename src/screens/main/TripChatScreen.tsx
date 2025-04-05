
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<MainStackParamList, 'TripChat'>;

interface ChatRoom {
  id: string;
  trip_id: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
  sender: {
    firstname: string;
    lastname: string;
    avatar_url: string | null;
  };
}

const TripChatScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tripId } = route.params;
  const { user } = useAuth();
  
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [tripTitle, setTripTitle] = useState('');
  const [isUserInChat, setIsUserInChat] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const subscription = useRef<any>(null);

  useEffect(() => {
    fetchTripTitle();
    getChatRoom();

    return () => {
      if (subscription.current) {
        supabase.removeChannel(subscription.current);
      }
    };
  }, [tripId]);

  const fetchTripTitle = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('title')
        .eq('id', tripId)
        .single();
      
      if (error) throw error;
      setTripTitle(data.title);
    } catch (error) {
      console.error('Error fetching trip title:', error);
    }
  };

  const getChatRoom = async () => {
    try {
      // First check if a chat room exists for this trip
      const { data: roomData, error: roomError } = await supabase.rpc(
        'get_or_create_trip_chat_room',
        { p_trip_id: tripId }
      );
      
      if (roomError) throw roomError;
      
      const roomId = roomData;
      
      // Check if user is a participant in this chat
      const { data: participantData, error: participantError } = await supabase
        .from('chat_room_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user?.id)
        .single();
      
      setIsUserInChat(!!participantData);
      
      if (!participantData) {
        setLoading(false);
        return;
      }
      
      // Fetch chat room details
      const { data: chatRoomData, error: chatRoomError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (chatRoomError) throw chatRoomError;
      setChatRoom(chatRoomData);
      
      // Fetch initial messages
      fetchMessages(roomId);
      
      // Subscribe to new messages
      subscribeToMessages(roomId);
    } catch (error) {
      console.error('Error getting chat room:', error);
      setLoading(false);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, sender:profiles!chat_messages_user_id_fkey(firstname, lastname, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = (roomId: string) => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          // When we get a new message, fetch the sender details
          const { data, error } = await supabase
            .from('profiles')
            .select('firstname, lastname, avatar_url')
            .eq('id', payload.new.user_id)
            .single();
          
          if (!error && data) {
            const newMessage = {
              ...payload.new,
              sender: data,
            } as ChatMessage;
            
            setMessages((current) => [...current, newMessage]);
            
            // Scroll to bottom on new message
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        }
      )
      .subscribe();
    
    subscription.current = channel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatRoom || !user) return;
    
    setSendingMessage(true);
    
    try {
      const { error } = await supabase.from('chat_messages').insert([
        {
          room_id: chatRoom.id,
          user_id: user.id,
          message: newMessage.trim(),
        },
      ]);
      
      if (error) throw error;
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderMessageItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isCurrentUser = item.user_id === user?.id;
    const showDate = index === 0 || formatDate(messages[index - 1].created_at) !== formatDate(item.created_at);
    
    return (
      <>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isCurrentUser ? styles.userMessageContainer : styles.otherMessageContainer
        ]}>
          {!isCurrentUser && (
            item.sender?.avatar_url ? (
              <Image source={{ uri: item.sender.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.initialsContainer}>
                <Text style={styles.initialsText}>
                  {`${item.sender?.firstname?.charAt(0) || ''}${item.sender?.lastname?.charAt(0) || ''}`.toUpperCase()}
                </Text>
              </View>
            )
          )}
          
          <View style={[
            styles.messageBubble,
            isCurrentUser ? styles.userBubble : styles.otherBubble
          ]}>
            {!isCurrentUser && (
              <Text style={styles.senderName}>{item.sender?.firstname} {item.sender?.lastname}</Text>
            )}
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.userMessageText : styles.otherMessageText
            ]}>
              {item.message}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
      </>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  if (!isUserInChat) {
    return (
      <View style={styles.notParticipantContainer}>
        <Ionicons name="chatbubble-ellipses-outline" size={64} color="#95a5a6" />
        <Text style={styles.notParticipantTitle}>Chat Unavailable</Text>
        <Text style={styles.notParticipantText}>
          You need to be an approved participant to access the chat room.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {tripTitle}
        </Text>
      </View>
      
      <FlatList
        ref={flatListRef}
        style={styles.chatList}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContent}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sendingMessage}
        >
          {sendingMessage ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  notParticipantContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notParticipantTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginVertical: 16,
  },
  notParticipantText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
    flex: 1,
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateText: {
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#7f8c8d',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  initialsContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#95a5a6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    alignSelf: 'flex-end',
  },
  initialsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    minWidth: 80,
  },
  userBubble: {
    backgroundColor: '#3498db',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 15,
  },
  userMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#2c3e50',
  },
  timeText: {
    fontSize: 10,
    opacity: 0.7,
    alignSelf: 'flex-end',
    marginTop: 4,
    color: 'inherit',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ececec',
  },
  input: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#3498db',
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
});

export default TripChatScreen;
