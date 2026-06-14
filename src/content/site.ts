import { lorem } from "./lorem";

export const site = {
  name: "SmileCare Dental Clinic",
  tagline: "Your smile, our passion",
  type: "dental clinic",
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
  location: {
    city: "Lorem Ipsum",
    province: "Dolor Sit",
    country: "Amet",
    full: lorem.contact.address,
    landmark: lorem.contact.landmark,
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2886.5!2d-79.42!3d43.64!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDPCsDM4JzI0LjAiTiA3OcKwMjUnMTIuMCJX!5e0!3m2!1sen!2sca!4v1",
    coordinates: { lat: 43.64, lng: -79.42 },
  },
  contact: {
    phones: [...lorem.contact.phones],
    email: lorem.contact.email,
    facebook: "https://facebook.com/smilecaredental",
  },
  hours: {
    summary: "Mon–Sat 9 AM–5 PM, Sunday by appointment",
    schedule: [
      { days: "Monday – Friday", hours: "9:00 AM – 5:00 PM" },
      { days: "Saturday", hours: "9:00 AM – 5:00 PM" },
      { days: "Sunday", hours: "By appointment only" },
    ],
  },
  brand: {
    primary: "#3B7A5C",
    accent: "#D4729B",
    dark: "#1A3C34",
    cream: "#FAF7F2",
    surface: "#F4F1EC",
  },
  social: {
    rating: 4.9,
    reviewCount: 240,
    patientCount: "2,500+",
  },
} as const;

export type Site = typeof site;
