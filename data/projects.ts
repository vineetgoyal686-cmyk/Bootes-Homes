/**
 * Typed, data-driven project config. Every showcase project (currently just the
 * Sector 20 house) is described here; page components read from this instead of
 * hard-coding copy, so adding the next project later is a data change, not a new
 * set of components.
 *
 * Fields marked TODO are real-world facts (dates, contact details, specs) that
 * can't be safely guessed - they're filled with clearly-labelled placeholders
 * until the client supplies real values.
 */

export interface ProjectMilestone {
  label: string;
  /** ISO date (YYYY-MM-DD), or null if not yet known. */
  date: string | null;
  /** One-line description of the stage, shown in the standalone timeline section. */
  description: string;
}

export interface FloorArea {
  label: string;
  /** Exact figure from the client's floor area sheet, in sq. ft. */
  sqft: number;
}

export interface JourneyImage {
  /** File name under /media/journey (without extension). */
  name: string;
  width: number;
  height: number;
  /** CSS object-position for cropping into the card frame (default centre). */
  focus?: string;
}

export interface JourneyStage {
  label: string;
  /** Short headline for the stage card. */
  tagline: string;
  /** ISO date of the stage's main photo. */
  date: string;
  caption: string;
  /** Where the main photo was taken from. */
  view: "Street view" | "Site camera";
  /** First image is the hero of the card; the rest are supporting shots. */
  images: JourneyImage[];
}

/** A point in the timelapse video and the date the site camera shows there. */
export interface TimelapseMark {
  /** Seconds into the video. */
  t: number;
  /** ISO date burned into the camera frame at that point. */
  date: string;
}

/** One month of the timelapse, shown as a jump-in card on the page. */
export interface TimelapseChapter {
  month: string;
  title: string;
  caption: string;
  /** Seconds into the video where this chapter starts playing. */
  t: number;
  /** Still under /media/timelapse (without extension). */
  image: string;
}

export interface ProjectStats {
  /** null hides the stat until a figure is confirmed from a document. */
  plotSize: string | null;
  /** Shown under the plot size stat, e.g. "10 m × 25 m". */
  plotDimensions?: string;
  builtUpArea: string;
  floors: string;
  /** Floor-wise breakup of builtUpArea, listed bottom (lowest level) to top. */
  floorAreas: FloorArea[];
}

export interface ProjectFeature {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  /** Shown on the feature card; left hidden while it still contains "TBD". */
  spec: string;
}

export interface Project {
  slug: string;
  name: string;
  location: string;
  tagline: string;
  heroSubtitle: string;
  /** ISO date the overall project began (land/planning), or null if unknown. */
  startDate: string | null;
  /** ISO date physical construction began (after demolition) - used for the
   * "build duration" stat, which counts from here rather than from startDate. */
  constructionStartDate: string | null;
  /** ISO date construction completed, or null if the project is still ongoing. */
  completionDate: string | null;
  milestones: ProjectMilestone[];
  stats: ProjectStats;
  address: string | null;
  whatsappNumber: string | null;
  mapEmbedQuery: string | null;
  features: ProjectFeature[];
  /** Video time -> real date, read off the camera's own timestamp. Used by the
   * timelapse player for month markers and the live date readout. The camera
   * doesn't capture at an even rate, so dates are interpolated between these. */
  timelapseDates: TimelapseMark[];
  /** Month-by-month jump points into the timelapse. */
  timelapseChapters: TimelapseChapter[];
  /** Photo-per-stage story, oldest first. Empty hides the photos. */
  journey: JourneyStage[];
  /** Number of gallery slots to render as placeholders until real photos land. */
  galleryPlaceholderCount: number;
}

export const projects: Project[] = [
  {
    slug: "sector-20-noida",
    name: "The Sector 20 Residence",
    location: "Sector 20, Noida",
    tagline: "Built to outlast the blueprint.",
    heroSubtitle:
      "A complete walkthrough of the first home Bootes Homes delivered in Noida — from foundation to finish.",
    // Confirmed by client: project began 20 Dec 2024, demolition of the
    // existing structure started 1 Jan 2025, physical construction started
    // 10 Feb 2025. Project is still ongoing (paint work as of now) - matches
    // the timelapse footage's own on-screen timestamps (Apr-May 2025).
    startDate: "2024-12-20",
    constructionStartDate: "2025-02-10",
    completionDate: null,
    milestones: [
      {
        label: "Demolition",
        date: "2025-01-01",
        description: "The existing structure on the plot is cleared to make way for the new build.",
      },
      {
        label: "Construction start",
        date: "2025-02-10",
        description: "Foundation work begins and the structure starts rising floor by floor.",
      },
      {
        label: "Paint work",
        date: null, // current stage - exact date TBD
        description: "Interior and exterior finishing is underway as the house nears completion.",
      },
    ],
    stats: {
      // From the NOIDA possession certificate and lease deed: 25.00 m x 10.00 m
      // = 250.00 sq. m (~2,691 sq. ft. / ~299 sq. yd.). The basement/ground
      // stilt (2,690 sq. ft.) covers the full plot.
      plotSize: "250 sq. m.",
      plotDimensions: "10 m × 25 m",
      // Real figure from client's floor area sheet: basement/ground stilt
      // 2690 + first 2360.744 + second 2360.744 + roof 2360.744 + mumty
      // 484.63 = 10,256.862, rounded for display.
      builtUpArea: "10,257 sq. ft.",
      // Ground + first + second are the 3 livable slab levels; roof and mumty
      // (stair-head room) sit on top rather than counting as extra floors -
      // reads as G+2 in standard Indian real-estate shorthand. Flag if this
      // reading is wrong.
      floors: "G+2",
      floorAreas: [
        { label: "Basement / Ground (stilt)", sqft: 2690 },
        { label: "First floor", sqft: 2360.744 },
        { label: "Second floor", sqft: 2360.744 },
        // TODO(client): confirm whether this is covered area or the open roof
        // terrace - relabel "Roof terrace" if it's open.
        { label: "Roof", sqft: 2360.744 },
        { label: "Mumty (stair-head)", sqft: 484.63 },
      ],
    },
    // TODO(client): real address needed before launch.
    address: null,
    // TODO(client): real WhatsApp business number needed before launch.
    whatsappNumber: null,
    mapEmbedQuery: "Sector 20, Noida, Uttar Pradesh",
    // TODO(client): confirm real brands/capacities for every spec below.
    features: [
      {
        id: "radiant",
        name: "Radiant Floor Cooling & Heating",
        description:
          "Water loops run under the floor of every level, so the whole room warms or cools evenly from the ground up — no vents, no cold/hot spots, no blowing air.",
        benefits: [
          "Silent - no fans or blower noise",
          "Even temperature across the whole room, floor to ceiling",
          "No visible ductwork or vents to clean",
        ],
        spec: "PEX loops, ~150mm spacing, per-floor manifold (capacity: TBD)",
      },
      {
        id: "chiller",
        name: "Rooftop Chiller",
        description:
          "One outdoor unit on the roof produces chilled or heated water and sends it down to every floor's radiant loop through insulated pipes.",
        benefits: [
          "One machine conditions the whole house",
          "Quieter and more efficient than multiple split ACs",
          "Switches between cooling and heating for the same pipework",
        ],
        spec: "Capacity and brand: TBD - confirm with MEP contractor",
      },
      {
        id: "solar",
        name: "Rooftop Solar",
        description: "Solar panels on the roof offset the home's daytime electricity use.",
        benefits: ["Lower monthly electricity bills", "Backup-friendly with the right inverter"],
        spec: "Panel count and capacity: TBD",
      },
      {
        id: "water-treatment",
        name: "Water Treatment & Recycling",
        description:
          "Incoming water is filtered before use, and wastewater is treated on-site rather than sent straight to the drain.",
        benefits: ["Cleaner water at every tap", "Treated water reused for gardening/flushing"],
        spec: "System capacity: TBD",
      },
      {
        id: "smart-home",
        name: "Smart Home Controls",
        description: "Lighting, security, and the radiant system can be controlled from one app.",
        benefits: ["One app for lights, security and climate", "Check on the house remotely"],
        spec: "Platform: TBD",
      },
    ],
    // Read from the timestamp in the video frames every 8s.
    timelapseDates: [
      { t: 0, date: "2025-01-02" },
      { t: 8, date: "2025-01-30" },
      { t: 16, date: "2025-02-12" },
      { t: 24, date: "2025-02-19" },
      { t: 32, date: "2025-02-26" },
      { t: 40, date: "2025-03-12" },
      { t: 48, date: "2025-03-19" },
      { t: 56, date: "2025-03-25" },
      { t: 64, date: "2025-04-01" },
      { t: 72, date: "2025-04-08" },
      { t: 80, date: "2025-04-15" },
      { t: 88, date: "2025-04-22" },
      { t: 96, date: "2025-05-01" },
      { t: 104, date: "2025-05-13" },
      { t: 112, date: "2025-05-24" },
      { t: 118, date: "2025-05-29" },
    ],
    // Stills are frames from the timelapse itself (bottom timestamp strip
    // cropped off); `t` is where each month begins in the video.
    timelapseChapters: [
      { month: "Jan", title: "Demolition", caption: "The old house comes down and the plot is cleared.", t: 0, image: "jan" },
      { month: "Feb", title: "Excavation & footings", caption: "The site is dug out and the foundation cast.", t: 9.2, image: "feb" },
      { month: "Mar", title: "Basement & first slab", caption: "Basement walls rise and the ground slab is reinforced.", t: 33.7, image: "mar" },
      { month: "Apr", title: "Ground floor", caption: "Columns go up and the next slab is shuttered and poured.", t: 64, image: "apr" },
      { month: "May", title: "Upper floors", caption: "Work moves up to the top slab and roof.", t: 96, image: "may" },
    ],
    // Photos cropped to remove camera timestamps/watermarks, metadata stripped
    // (see public/media/journey). No house numbers or addresses in frame.
    journey: [
      {
        label: "Before",
        tagline: "Where it began.",
        date: "2024-12-14",
        caption: "The original house on the plot, days before work started.",
        view: "Street view",
        images: [
          { name: "before", width: 902, height: 1480, focus: "50% 35%" },
          { name: "before-2", width: 820, height: 820 },
        ],
      },
      {
        label: "Demolition",
        tagline: "Back to the ground.",
        date: "2025-02-01",
        caption: "Taken down through January, by day and through the night, then levelled.",
        view: "Site camera",
        images: [
          { name: "demolition", width: 3840, height: 1960, focus: "70% 60%" },
          { name: "demolition-2", width: 3840, height: 1960, focus: "72% 55%" },
          { name: "demolition-3", width: 3840, height: 1960, focus: "68% 60%" },
        ],
      },
      {
        label: "Foundation",
        tagline: "Built from below.",
        date: "2025-02-15",
        caption: "Excavation, footings and the first steel cages set into the earth.",
        view: "Site camera",
        images: [
          { name: "foundation", width: 3840, height: 1960, focus: "74% 60%" },
          { name: "foundation-2", width: 1200, height: 1240 },
          { name: "foundation-3", width: 3840, height: 1960, focus: "74% 60%" },
        ],
      },
      {
        label: "Today",
        tagline: "Standing tall.",
        date: "2026-09-25",
        caption: "The new home on the same plot, with finishing work underway.",
        view: "Street view",
        images: [
          { name: "today", width: 960, height: 1130, focus: "50% 25%" },
          { name: "today-2", width: 620, height: 880 },
        ],
      },
    ],
    galleryPlaceholderCount: 8,
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export const featuredProject = projects[0];
