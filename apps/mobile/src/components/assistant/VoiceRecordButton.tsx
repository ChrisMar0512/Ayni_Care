import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

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
        let base64Pure = '';
        if (Platform.OS !== 'web') {
          base64Pure = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });
        } else {
          const response = await fetch(uri);
          const blob = await response.blob();
          base64Pure = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.includes(',') ? res.split(',')[1] : res);
            };
            reader.readAsDataURL(blob);
          });
        }

        if (base64Pure) {
          onSendAudio(base64Pure, 'audio/m4a');
        }
      }
    } catch (err) {
      console.error('Error al procesar audio:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <View style={styles.buttonProcessing}>
        <ActivityIndicator size="small" color="#D4856A" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={isRecording ? stopRecording : startRecording}
      activeOpacity={0.7}
      style={[
        styles.button,
        isRecording ? styles.buttonRecording : styles.buttonIdle,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Ionicons
        name={isRecording ? 'stop' : 'mic'}
        size={22}
        color="#FFFFFF"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonIdle: {
    backgroundColor: '#D4856A',
  },
  buttonRecording: {
    backgroundColor: '#EF4444',
  },
  buttonProcessing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDF0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
