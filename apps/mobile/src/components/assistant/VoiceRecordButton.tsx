import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';

interface Props {
  onSendAudio: (base64Audio: string, mimeType: string) => void;
  disabled?: boolean;
}

export const VoiceRecordButton: React.FC<Props> = ({ onSendAudio, disabled }) => {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [isProcessing, setIsProcessing] = useState(false);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso Requerido',
          'Ayni Care necesita acceso al micrófono para que puedas registrar actividades con tu voz.'
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (err) {
      console.error('Error al iniciar grabación:', err);
    }
  };

  const stopRecording = async () => {
    setIsProcessing(true);

    try {
      await recorder.stop();
      const uri = recorder.uri;

      if (uri) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64Pure = base64data.includes(',') ? base64data.split(',')[1] : base64data;
          if (base64Pure) {
            onSendAudio(base64Pure, 'audio/m4a');
          }
          setIsProcessing(false);
        };

        reader.onerror = () => {
          setIsProcessing(false);
        };

        reader.readAsDataURL(blob);
      } else {
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Error al procesar audio:', err);
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

  const isRecording = recorderState.isRecording;

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
