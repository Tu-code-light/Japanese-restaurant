import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const isLanguage = (value) => value === 'vi' || value === 'en';

export const useLanguageStore = create(
  persist(
    (set) => ({
      language: 'vi',
      setLanguage: (language) => {
        if (isLanguage(language)) set({ language });
      },
    }),
    {
      name: 'qr-order-language',
      partialize: ({ language }) => ({ language }),
      merge: (persisted, current) => ({
        ...current,
        language: isLanguage(persisted?.language) ? persisted.language : 'vi',
      }),
    },
  ),
);
