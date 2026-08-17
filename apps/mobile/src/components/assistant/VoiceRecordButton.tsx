import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface Props {
  onSendAudio: (base64Audio: string, mimeType: string) => void;
  disabled?: boolean;
}

export const VoiceRecordButton: React.FC<Props> = ({ onSendAudio, disabled }) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Ayni Care necesita acceso al micrófono para que puedas registrar actividades con tu voz.'
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Error al iniciar grabación:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    setIsProcessing(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        // En plataformas web o Expo, convertimos a base64
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Extraer la porción base64 pura después de la coma
          const base64Pure = base64data.includes(',') ? base64data.split(',')[1] : base64data;
          onSendAudio(base64Pure, 'audio/m4a');
          setIsProcessing(false);
        };

        reader.readAsDataURL(blob);
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Error al detener grabación:', err);
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center">
        <ActivityIndicator size="small" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={isRecording ? stopRecording : startRecording}
      activeOpacity={0.7}
      className={`w-12 h-12 rounded-full items-center justify-center shadow-sm ${
        isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#2D6A4F]'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <Ionicons
        name={isRecording ? 'stop' : 'mic'}
        size={24}
        color="#FFFFFF"
      />
    </TouchableOpacity>
  );
};
