// Version 2.0.0 declares dist/index.d.ts in its package metadata but does not
// ship that file. Keep this declaration aligned with its exported button API.
declare module "react-toggle-dark-mode" {
  import type { ButtonHTMLAttributes, ComponentType } from "react";

  type ThemeAnimation = {
    circle?: { r?: number };
    mask?: { cx?: string; cy?: string };
    svg?: { transform?: string };
    lines?: { opacity?: number };
  };

  export interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "children"> {
    onChange: (checked: boolean) => void;
    checked: boolean;
    size?: number | string;
    moonColor?: string;
    sunColor?: string;
    animationProperties?: {
      dark?: ThemeAnimation;
      light?: ThemeAnimation;
      springConfig?: { mass?: number; tension?: number; friction?: number };
    };
  }

  export const DarkModeSwitch: ComponentType<Props>;
}
