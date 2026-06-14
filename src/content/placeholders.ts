/** Curated free Unsplash photos — dental clinic, dentistry, and smiles */
const DENTAL_PHOTOS = {
  heroClinic: "photo-1643916800611-1302e8d27c38",
  heroSmile: "photo-1675526607070-f5cbd71dde92",
  dentistExam: "photo-1685022036266-7db6e5161ee1",
  dentalOffice: "photo-1629909613654-28e377c37b09",
  reception: "photo-1704455306251-b4634215d98f",
  dentistMale: "photo-1606811841689-23dfddce3e95",
  dentistFemale: "photo-1606811971618-4486d14f3f99",
  orthodontist: "photo-1588776813941-dcf9c55e84d2",
  hygienist: "photo-1588776814546-daab30f310ce",
  teethClose: "photo-1670250492416-570b5b7343b1",
  smileBright: "photo-1675526607070-f5cbd71dde92",
  smileWoman: "photo-1489278353717-f64c6ee8a4d2",
  smileMan: "photo-1667133295308-9ef24f71952e",
  concernedFace: "photo-1667133295315-820bb6481730",
  dentalChair: "photo-1598256989800-fe5f95da9787",
} as const;

const BEFORE_AFTER_PHOTOS: Record<string, { before: string; after: string }> = {
  whitening: {
    before: DENTAL_PHOTOS.teethClose,
    after: DENTAL_PHOTOS.smileBright,
  },
  "veneers-case": {
    before: DENTAL_PHOTOS.concernedFace,
    after: DENTAL_PHOTOS.smileWoman,
  },
  "implants-case": {
    before: DENTAL_PHOTOS.dentalChair,
    after: DENTAL_PHOTOS.smileMan,
  },
};

const TEAM_PHOTOS: Record<string, string> = {
  "dr-chen": DENTAL_PHOTOS.dentistFemale,
  "dr-patel": DENTAL_PHOTOS.orthodontist,
  "maria-lopez": DENTAL_PHOTOS.hygienist,
};

export function dentalPhoto(photoId: string, width: number, height: number) {
  return `https://images.unsplash.com/${photoId}?w=${width}&h=${height}&fit=crop&auto=format&q=80`;
}

export const placeholders = {
  logo: {
    label: "Clinic logo",
    src: dentalPhoto(DENTAL_PHOTOS.dentalOffice, 80, 80),
  },
  og: {
    label: "Social share image",
    src: dentalPhoto(DENTAL_PHOTOS.heroClinic, 1200, 630),
  },
  hero: {
    main: {
      label: "Hero — clinic interior or smiling patient",
      src: dentalPhoto(DENTAL_PHOTOS.heroClinic, 1920, 1080),
    },
    accent: {
      label: "Hero accent — close-up smile detail",
      src: dentalPhoto(DENTAL_PHOTOS.heroSmile, 400, 400),
    },
  },
  about: {
    label: "About — team at work in modern clinic",
    src: dentalPhoto(DENTAL_PHOTOS.dentistExam, 800, 1000),
  },
  services: {
    label: "Services — dental equipment or treatment room",
    src: dentalPhoto(DENTAL_PHOTOS.dentalOffice, 640, 853),
  },
  booking: {
    label: "Booking — welcoming reception area",
    src: dentalPhoto(DENTAL_PHOTOS.reception, 1600, 900),
  },
} as const;

export function beforeAfterPlaceholder(id: string, type: "before" | "after") {
  const photos = BEFORE_AFTER_PHOTOS[id] ?? BEFORE_AFTER_PHOTOS.whitening;
  const photoId = type === "before" ? photos.before : photos.after;

  return {
    label: type === "before" ? "Before treatment photo" : "After treatment photo",
    src: dentalPhoto(photoId, 600, 600),
  };
}

export function teamPlaceholder(id: string, name: string) {
  const photoId = TEAM_PHOTOS[id] ?? DENTAL_PHOTOS.dentistMale;

  return {
    label: `Team member portrait — ${name}`,
    src: dentalPhoto(photoId, 400, 400),
  };
}
