import {
  BookOpenText,
  Boxes,
  Film,
  Music2,
  Play,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PlatformModule, View } from "../../types";

export type ModuleNavKey = PlatformModule;
export type SecondaryNavItem<Key extends string> = [Key, string, LucideIcon];
export type ModuleNavItem = {
  key: ModuleNavKey;
  label: string;
  Icon: LucideIcon;
  children?: Array<SecondaryNavItem<PlatformModule>>;
};

export const videoNav: Array<SecondaryNavItem<View>> = [
  ["flow", "生产总览", Film],
  ["materials", "素材归类", Boxes],
  ["copy", "内容文库", BookOpenText],
  ["music", "背景音乐", Music2],
  ["production", "剪映草稿", Play],
];

export const moduleGroups: Array<{ title: string; items: ModuleNavItem[] }> = [
  {
    title: "内容生产中心",
    items: [
      { key: "video", label: "视频生产", Icon: Film },
      { key: "aiVideo", label: "AI视频", Icon: WandSparkles },
    ],
  },
];

export const validExpandedModules: ModuleNavKey[] = ["video"];

export function getExpandedModule(value: PlatformModule): ModuleNavKey | "" {
  if (value === "video") return value;
  return "";
}

export function getActiveTitle(module: PlatformModule, view: View) {
  if (module === "video") return videoNav.find(([key]) => key === view)?.[1];
  return "AI视频";
}

export function getHeaderSubtitle(module: PlatformModule) {
  if (module === "video") return "电商内容平台 · 视频生产";
  return "电商内容平台 · AI视频生产";
}
