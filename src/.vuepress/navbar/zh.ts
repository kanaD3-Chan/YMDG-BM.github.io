import { navbar } from "vuepress-theme-hope";

export const zhNavbar = navbar([
  "/",
  "/portfolio/",
  "/ctf/",
  "/articles/",
  "/study/",
  "/misc/",
  {
    text: "订阅",
    icon: "rss",
    children: [
      { text: "RSS 源", link: "https://kanade-chan.top/rss.xml", icon: "rss" },
      { text: "Atom 源", link: "https://kanade-chan.top/atom.xml", icon: "atom" },
      { text: "JSON Feed", link: "https://kanade-chan.top/feed.json", icon: "code" },
    ],
  },
]);
