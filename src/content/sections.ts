import { site } from "./site";
import { lorem } from "./lorem";

export const hero = {
  label: "Welcome to SmileCare",
  titleLine1: "Healthy Smiles Start",
  titleAccent: "Here",
  titleLine2: "With Expert Dental Care",
  description: lorem.long,
  ctaPrimary: { label: "Book Appointment", href: "#booking" },
  ctaSecondary: { label: "Our Services", href: "#services" },
  rating: site.social.rating,
  reviewCount: site.social.reviewCount,
  patientAvatars: 4,
};

export const about = {
  label: "About Us",
  title: "Caring for",
  titleAccent: "Toronto",
  titleEnd: "One Smile at a Time",
  story: [...lorem.paragraphs],
  stats: [
    { value: 15, suffix: "+", label: "Years of Experience" },
    { value: 2500, suffix: "+", label: "Happy Patients" },
    { value: 20, suffix: "", label: "Dental Services" },
    { value: 98, suffix: "%", label: "Patient Satisfaction" },
  ],
};

export const servicesIntro = {
  label: "Our Services",
  title: "Comprehensive",
  titleAccent: "Dental",
  titleEnd: "Care for Every Need",
  description: lorem.medium,
};

export const beforeAfter = {
  label: "Results",
  title: "Real",
  titleAccent: "Transformations",
  titleEnd: "You Can Trust",
  description: lorem.medium,
  cases: [
    {
      id: "whitening",
      title: "Professional Whitening",
      description: lorem.short,
    },
    {
      id: "veneers-case",
      title: "Porcelain Veneers",
      description: lorem.short,
    },
    {
      id: "implants-case",
      title: "Dental Implants",
      description: lorem.short,
    },
  ],
};

export const team = {
  label: "Our Team",
  title: "Meet the",
  titleAccent: "Experts",
  titleEnd: "Behind Your Smile",
  description: lorem.medium,
  members: [
    {
      id: "dr-chen",
      name: "Dr. Sarah Chen",
      role: "Lead Dentist & Founder",
      bio: lorem.medium,
    },
    {
      id: "dr-patel",
      name: "Dr. Raj Patel",
      role: "Orthodontist",
      bio: lorem.medium,
    },
    {
      id: "maria-lopez",
      name: "Maria Lopez",
      role: "Dental Hygienist",
      bio: lorem.medium,
    },
  ],
};

export const testimonials = {
  label: "Testimonials",
  title: "What Our",
  titleAccent: "Patients",
  titleEnd: "Are Saying",
  quotes: [
    {
      id: "t1",
      text: lorem.quote,
      author: "Jennifer M.",
      service: "Veneers",
      rating: 5,
    },
    {
      id: "t2",
      text: lorem.quote,
      author: "David K.",
      service: "General Dentistry",
      rating: 5,
    },
    {
      id: "t3",
      text: lorem.quote,
      author: "Priya S.",
      service: "Pediatric Dentistry",
      rating: 5,
    },
  ],
};

export const booking = {
  label: "Book Now",
  title: "Schedule Your",
  titleAccent: "Appointment",
  titleEnd: "Today",
  description: lorem.medium,
  timeSlots: [
    "9:00 AM",
    "9:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "1:00 PM",
    "1:30 PM",
    "2:00 PM",
    "2:30 PM",
    "3:00 PM",
    "3:30 PM",
    "4:00 PM",
    "4:30 PM",
  ],
};

export const faq = {
  label: "FAQ",
  title: "Frequently Asked",
  titleAccent: "Questions",
  categories: [
    {
      id: "general",
      name: "General",
      items: [
        {
          question: "What should I bring to my first appointment?",
          answer: lorem.long,
        },
        {
          question: "Do you accept dental insurance?",
          answer: lorem.long,
        },
        {
          question: "Is your clinic wheelchair accessible?",
          answer: lorem.long,
        },
      ],
    },
    {
      id: "appointments",
      name: "Appointments",
      items: [
        {
          question: "How do I book an appointment?",
          answer: lorem.long,
        },
        {
          question: "What is your cancellation policy?",
          answer: lorem.long,
        },
        {
          question: "Do you offer emergency appointments?",
          answer: lorem.long,
        },
      ],
    },
    {
      id: "services",
      name: "Services",
      items: [
        {
          question: "How often should I get a dental cleaning?",
          answer: lorem.long,
        },
        {
          question: "Is teeth whitening safe?",
          answer: lorem.long,
        },
        {
          question: "How long do dental implants last?",
          answer: lorem.long,
        },
      ],
    },
  ],
};

export const contact = {
  label: "Contact",
  title: "Visit Our",
  titleAccent: "Clinic",
  titleEnd: "Today",
  description: lorem.medium,
};
