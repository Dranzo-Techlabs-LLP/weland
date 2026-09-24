"use client";

// Every photo on the page opens full screen, as a slideshow of the photos in
// its group (the gallery, the rooms, the dormitory, the hall). The viewer
// (yet-another-react-lightbox, as on the Kakkadampoyil Villas site) is only
// downloaded the first time someone opens a photo.
import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useState } from "react";
import { photoGroups, type PhotoGroup } from "@/lib/content";

const Viewer = dynamic(() => import("./LightboxViewer"), { ssr: false });

type OpenPhoto = (group: PhotoGroup, index: number) => void;

const LightboxContext = createContext<OpenPhoto>(() => {});

export const useOpenPhoto = () => useContext(LightboxContext);

export default function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState<{ group: PhotoGroup; index: number } | null>(null);
  const open = useCallback<OpenPhoto>((group, index) => setShown({ group, index }), []);

  return (
    <LightboxContext.Provider value={open}>
      {children}
      {shown && <Viewer slides={photoGroups[shown.group]} index={shown.index} onClose={() => setShown(null)} />}
    </LightboxContext.Provider>
  );
}
