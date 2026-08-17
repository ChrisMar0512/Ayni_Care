import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAssistant } from '../../hooks/useAssistant';
import { ChatMessageBubble } from '../../components/assistant/ChatMessageBubble';
import { QuickSuggestionPills } from '../../components/assistant/QuickSuggestionPills';
import { VoiceRecordButton } from '../../components/assistant/VoiceRecordButton';

export const ChatAssistantScreen: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const { messages, isLoading, sendMessage, clearMessages } = useAssistant();
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll al recibir un nuevo mensaje
  useEffect(() => {
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSendText = () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    setInputText('');
    sendMessage({ message: text });
  };

  const handleSendAudio = (audioBase64: string, audioMimeType: string) => {
    if (isLoading) return;
    sendMessage({ audioBase64, audioMimeType });
  };

  const handleSelectSuggestion = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ message: prompt });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAF8]">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAF8" />

      {/* ─── Encabezado ────────────────────────────────────────── */}
      <View className="px-5 py-3.5 bg-white border-b border-gray-200/70 flex-row items-center justify-between shadow-xs">
        <View className="flex-row items-center space-x-3">
          <View className="w-10 h-10 rounded-full bg-[#2D6A4F] items-center justify-center shadow-xs">
            <Ionicons name="leaf" size={20} color="#FFFFFF" />
          </View>
          <View>
            <View className="flex-row items-center space-x-1.5">
              <Text className="text-lg font-bold text-gray-900">Ayni Asistente</Text>
              <View className="w-2 h-2 rounded-full bg-emerald-500" />
            </View>
            <Text className="text-xs text-gray-500 font-medium">
              Coordinación inteligente por voz y chat
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={clearMessages}
          activeOpacity={0.6}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <Ionicons name="trash-outline" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* ─── Lista de Mensajes ─────────────────────────────────── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatMessageBubble message={item} />}
          contentContainerStyle={{ paddingVertical: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* ─── Píldoras de Sugerencia Rápida ─────────────────────── */}
        <QuickSuggestionPills
          onSelectSuggestion={handleSelectSuggestion}
          disabled={isLoading}
        />

        {/* ─── Barra de Entrada (Texto y Audio) ───────────────────── */}
        <View className="px-4 py-3 bg-white border-t border-gray-200 flex-row items-center space-x-2">
          {/* Botón de Voz */}
          <VoiceRecordButton
            onSendAudio={handleSendAudio}
            disabled={isLoading}
          />

          {/* Campo de Texto */}
          <View className="flex-1 flex-row items-center bg-[#F3F4F6] rounded-full px-4 py-2.5 min-h-[48px] border border-gray-200">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escribe o mantén el micrófono..."
              placeholderTextColor="#9CA3AF"
              className="flex-1 text-base text-gray-900 p-0"
              multiline
              maxLength={500}
              editable={!isLoading}
              onSubmitEditing={handleSendText}
            />

            {inputText.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSendText}
                disabled={isLoading}
                activeOpacity={0.7}
                className="ml-2 w-8 h-8 rounded-full bg-[#2D6A4F] items-center justify-center"
              >
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
