export type Year = "freshman" | "sophomore" | "junior" | "senior" | "mfa1" | "mfa2";
export type Interest = "branding" | "motion" | "interactive" | "typography" | "editorial" | "exhibition" | "history";
export type Direction = "left" | "right" | "up" | "down";

export interface Course {
  /** Unique id. Usually the course code, suffixed when a code appears twice (see AR594, AR596). */
  id: string;
  code: string;
  title: string;
  term?: "F" | "S";
  active: boolean;
  description?: string;
  interests: Interest[];
}

/** The room's one clickable object, in % of the scene image (top-left + size). Tapping it opens the class list. */
export interface SceneObject { label: string; x: number; y: number; w: number; h: number }

/** Doors (left/right) and stairs (up/down). Placed automatically at the screen edge by direction. */
export interface Exit { toRoomId: string; label: string; direction: Direction }

export interface Room {
  id: string;
  name: string;
  subtitle: string;
  floor: number;
  year?: Year;
  /** Path under /public, e.g. "scenes/kitchen.png". Empty = generated placeholder scene. */
  sceneImage: string;
  sceneAlt: string;
  /** Where avatars' feet can go: a band of floor, as % of the scene height (top < bottom). */
  floorTop: number;
  floorBottom: number;
  object: SceneObject;
  /** Something in the scene that greets the user with a speech bubble (the Living Room cat). x/y is where the bubble's tail points, in %. */
  greeter?: { label: string; x: number; y: number };
  /** Where this room sits in the house map image, in % (top-left + size). */
  mapArea: { x: number; y: number; w: number; h: number };
  exits: Exit[];
  courses: Course[];
}

export interface Floor { floor: number; label: string }
export interface HouseData {
  sceneAspect: number;
  /** Where everyone starts when they enter the house (not their year's room). */
  entryRoomId: string;
  /** The illustrated cross-section shown in the Map panel (path under /public, pixel size, alt text). */
  map: { image: string; width: number; height: number; alt: string };
  floors: Floor[];
  rooms: Room[];
}

export interface Professor {
  id: string;
  name: string;
  image: string;
  bio: string;
  specialties: Interest[];
  /** Course ids (not codes). */
  courses: string[];
  placeholder?: boolean;
}

/** Q1 is kept for the home room (and a future freshman hat). */
export interface YearOption { id: Year; label: string; homeRoomId: string }
export interface ProgramOption { id: string; label: string }
export interface InterestOption { id: Interest; label: string; hint: string }
export interface Questions {
  year: { prompt: string; options: YearOption[] };
  interest: { prompt: string; options: InterestOption[] };
  program: { prompt: string; options: ProgramOption[] };
}

export interface Answers { year: Year; interest: Interest; program: string }

/** Q2 interest → Q3 program id → professor id. */
export type Assignments = Record<Interest, Record<string, string>>;
