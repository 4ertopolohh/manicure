export type Kind = "shape" | "length" | "color" | "coating";
export interface NailOption {
  id: number;
  kind: Kind;
  name: string;
  value: string;
  extra_price: number;
  extra_minutes: number;
}
export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  audience: "women" | "men";
}
export interface Studio {
  name: string;
  hero_title: string;
  hero_text: string;
  master: string;
  master_text: string;
  address: string;
  address_note: string;
  horizon: number;
  seo_title: string;
  seo_description: string;
  canonical: string;
  indexable: boolean;
}
export interface Content {
  csrf: string;
  studio: Studio;
  services: Service[];
  options: NailOption[];
  gallery: { id: number; title: string; caption: string; image: string }[];
  today: string;
}
export interface Selection {
  service: number;
  options: number[];
}
export interface Booking {
  token: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  service: string;
  status: string;
  guest: string;
  reference_count: number;
  options: Record<string, string>;
}
export interface Slot {
  time: string;
  available: boolean;
}
