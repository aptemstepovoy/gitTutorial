"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

declare global {
  interface Window {
    SpeechRecognition?: SR;
    webkitSpeechRecognition?: SR;
  }
}

export function useVoice(onText: (delta: string, final: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const cbRef = useRef(onText);

  useEffect(() => {
    cbRef.current = onText;
  }, [onText]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(!!SRClass);
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SRClass) return;
    const rec = new SRClass();
    rec.lang = "ru-RU";
    rec.continuous = true;
    rec.interimResults = true;
    let final = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      cbRef.current((final + interim).trim(), false);
    };
    rec.onend = () => {
      setListening(false);
      if (final) cbRef.current(final.trim(), true);
    };
    rec.onerror = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, start, stop, toggle };
}
