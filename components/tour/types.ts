export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

export interface TourConfig {
  tourId: string;
  steps: TourStep[];
}
