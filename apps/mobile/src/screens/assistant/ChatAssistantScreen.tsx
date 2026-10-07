import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAssistant } from '../../hooks/useAssistant';
import { ChatMessageBubble } from '../../components/assistant/ChatMessageBubble';
import { QuickSuggestionPills } from '../../components/assistant/QuickSuggestionPills';
import { VoiceRecordButton } from '../../components/assistant/VoiceRecordButton';

export const ChatAssistantScreen: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { messages, isLoading, sendMessage, transcribeVoice, clearMessages } = useAssistant();
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

  const handleSendAudio = async (audioBase64: string, audioMimeType: string) => {
    if (isLoading || isTranscribing) return;
    setIsTranscribing(true);
    try {
      const text = await transcribeVoice(audioBase64, audioMimeType);
      if (text && text.trim().length > 0) {
        setInputText(text.trim());
      }
    } catch (err: any) {
      console.warn('Error al transcribir voz:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleSelectSuggestion = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ message: prompt });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* ─── Encabezado ────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>Ayni Asistente</Text>
              <View style={styles.onlineDot} />
            </View>
            <Text style={styles.headerSub}>Coordinación inteligente por voz y chat</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={clearMessages}
          activeOpacity={0.6}
          style={styles.trashBtn}
          accessibilityLabel="Limpiar conversación"
        >
          <Ionicons name="trash-outline" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* ─── Lista de Mensajes ─────────────────────────────────── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatMessageBubble message={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* ─── Píldoras de Sugerencia Rápida ─────────────────────── */}
        <QuickSuggestionPills
          onSelectSuggestion={handleSelectSuggestion}
          disabled={isLoading}
        />

        {/* ─── Barra de Entrada (Texto y Audio) ───────────────────── */}
        <View style={styles.inputContainer}>
          <VoiceRecordButton
            onSendAudio={handleSendAudio}
            disabled={isLoading || isTranscribing}
          />

          <View style={styles.inputWrapper}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={isTranscribing ? 'Transcribiendo tu voz con IA...' : 'Escribe o presiona el micrófono... (ej. "Papá tomó su pastilla")'}
              placeholderTextColor={isTranscribing ? '#D4856A' : '#9CA3AF'}
              style={styles.textInput}
              multiline
              maxLength={500}
              editable={!isLoading && !isTranscribing}
              onSubmitEditing={handleSendText}
            />

            {inputText.trim().length > 0 ? (
              <TouchableOpacity
                onPress={handleSendText}
                disabled={isLoading || isTranscribing}
                activeOpacity={0.7}
                style={styles.sendButton}
              >
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  headerSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardContainer: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#2C2C2C',
    padding: 0,
    maxHeight: 100,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D4856A',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
