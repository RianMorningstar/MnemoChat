import { useState, useRef, useCallback, useEffect } from "react";
import { synthesizeTts } from "./api";
import type { TtsProviderType, TtsSettings } from "@shared/tts-types";
import { getEmotionParams } from "@shared/tts-emotion-map";

interface TtsPlaybackState {
  /** ID of the message currently playing or loading */
  playingMessageId: string | null;
  /** ID of the message currently loading audio for */
  loadingMessageId: string | null;
}

export interface TtsPlaybackControls extends TtsPlaybackState {
  /** Play TTS for a message. Stops any currently playing audio first. */
  playMessage: (
    messageId: string,
    text: string,
    characterId: string,
    emotion?: string | null,
    provider?: TtsProviderType,
    voice?: string,
    settings?: TtsSettings,
  ) => void;
  /** Stop any currently playing audio */
  stopPlayback: () => void;
  /** Check if a specific message is currently playing */
  isPlaying: (messageId: string) => boolean;
  /** Check if a specific message is currently loading */
  isLoading: (messageId: string) => boolean;
}

/**
 * Hook for managing TTS audio playback.
 * Supports both system (Web Speech API) and backend-served audio (OpenAI, ElevenLabs).
 * Only one message plays at a time.
 */
export function useTtsPlayback(): TtsPlaybackControls {
  const [state, setState] = useState<TtsPlaybackState>({
    playingMessageId: null,
    loadingMessageId: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Clean up blob URL
  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // Stop any playing audio
  const stopPlayback = useCallback(() => {
    // Stop HTMLAudioElement
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Stop Web Speech API
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    revokeBlobUrl();
    setState({ playingMessageId: null, loadingMessageId: null });
  }, [revokeBlobUrl]);

  const playMessage = useCallback(
    (
      messageId: string,
      text: string,
      characterId: string,
      emotion?: string | null,
      provider?: TtsProviderType,
      voice?: string,
      settings?: TtsSettings,
    ) => {
      // Stop anything currently playing
      stopPlayback();

      // System provider: use Web Speech API directly
      if (provider === "system") {
        const utterance = new SpeechSynthesisUtterance(text);

        // Apply emotion modulation
        if (emotion) {
          const params = getEmotionParams(emotion);
          utterance.pitch = params.systemPitch;
          utterance.rate = params.systemRate;
        }

        // Set voice if specified
        if (voice) {
          const voices = window.speechSynthesis.getVoices();
          const match = voices.find((v) => v.voiceURI === voice || v.name === voice);
          if (match) utterance.voice = match;
        }

        utterance.onend = () => {
          setState({ playingMessageId: null, loadingMessageId: null });
        };
        utterance.onerror = () => {
          setState({ playingMessageId: null, loadingMessageId: null });
        };

        setState({ playingMessageId: messageId, loadingMessageId: null });
        window.speechSynthesis.speak(utterance);
        return;
      }

      // Backend providers: fetch audio blob
      setState({ playingMessageId: null, loadingMessageId: messageId });

      synthesizeTts(messageId, text, characterId, emotion, provider, voice, settings)
        .then((blob) => {
          revokeBlobUrl();
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;

          if (!audioRef.current) {
            audioRef.current = new Audio();
          }
          const audio = audioRef.current;
          audio.src = url;

          audio.onended = () => {
            setState({ playingMessageId: null, loadingMessageId: null });
          };
          audio.onerror = () => {
            setState({ playingMessageId: null, loadingMessageId: null });
          };

          setState({ playingMessageId: messageId, loadingMessageId: null });
          audio.play();
        })
        .catch((err) => {
          console.error("TTS playback error:", err);
          setState({ playingMessageId: null, loadingMessageId: null });
        });
    },
    [stopPlayback, revokeBlobUrl],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const isPlaying = useCallback(
    (messageId: string) => state.playingMessageId === messageId,
    [state.playingMessageId],
  );

  const isLoading = useCallback(
    (messageId: string) => state.loadingMessageId === messageId,
    [state.loadingMessageId],
  );

  return {
    ...state,
    playMessage,
    stopPlayback,
    isPlaying,
    isLoading,
  };
}
