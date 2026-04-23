export type VariantAttributeType = "text" | "number";

export interface VariantAttributeConfig {
  name: string;
  type?: VariantAttributeType;
  options?: string[];
}

export type ProductCategory =
  | "Cricket Bat"
  | "Cricket Ball"
  | "Football"
  | "Tennis Racket"
  | "Helmet"
  | "Pads"
  | "Footwear"
  | "Sportswear";

export const categoryConfig: Record<ProductCategory, VariantAttributeConfig[]> = {
  "Cricket Bat": [
    { name: "Weight lbs", type: "number" },
    { name: "Handle", options: ["Short", "Long"] },
    { name: "Willow Type", options: ["English", "Kashmir"] },
  ],
  "Cricket Ball": [
    { name: "Color", options: ["Red", "White", "Pink"] },
    { name: "Type", options: ["Leather", "Tennis", "Practice"] },
  ],
  Football: [
    { name: "Size", options: ["3", "4", "5"] },
    { name: "Surface", options: ["Grass", "Turf", "Indoor"] },
    { name: "Material", options: ["PU", "PVC", "Composite"] },
  ],
  "Tennis Racket": [
    { name: "Grip Size", options: ["4 1/8", "4 1/4", "4 3/8", "4 1/2"] },
    { name: "Head Size", options: ["Mid", "Midplus", "Oversize"] },
    { name: "Weight g", type: "number" },
  ],
  Helmet: [
    { name: "Size", options: ["S", "M", "L", "XL"] },
    { name: "Material", options: ["ABS", "Fiberglass", "Polycarbonate"] },
    { name: "Color", type: "text" },
  ],
  Pads: [
    { name: "Orientation", options: ["Left Handed", "Right Handed", "Ambidextrous"] },
    { name: "Size", options: ["Youth", "Small", "Medium", "Large"] },
    { name: "Use", options: ["Batting", "Wicket Keeping"] },
  ],
  Footwear: [
    { name: "Shoe Size", options: ["6", "7", "8", "9", "10", "11", "12"] },
    { name: "Stud Type", options: ["Metal", "Rubber", "Molded", "Spiked"] },
    { name: "Surface", options: ["Grass", "Turf", "Indoor"] },
  ],
  Sportswear: [
    { name: "Size", options: ["S", "M", "L", "XL"] },
    { name: "Color", type: "text" },
    { name: "Fit", options: ["Slim", "Regular"] },
  ],
};

export default categoryConfig;
