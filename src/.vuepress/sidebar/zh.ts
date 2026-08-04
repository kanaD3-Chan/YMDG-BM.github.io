import { sidebar } from "vuepress-theme-hope";

export const zhSidebar = sidebar({
  "/": [
    {
      text: "指南",
      icon: "compass",
      prefix: "guide/",
      link: "guide/",
    },
    {
      text: "关于贡献",
      icon: "mdi:heart",
      prefix: "about-contribution/",
      link: "about-contribution/",
    },
    {
      text: "运维",
      icon: "laptop-code",
      prefix: "operation/",
      link: "operation/",
    },
    {
      text: "纸上得来",
      icon: "codicon:note",
      prefix: "articles/",
      link: "articles/",
    },
    {
      text: "学习笔记",
      icon: "book",
      prefix: "study/",
      link: "study/",
      children: "structure",
    },
    {
      text: "CTF",
      icon: "flag",
      prefix: "ctf/",
      link: "ctf/",
      children: "structure",
    },
    {
      text: "Wiki",
      icon: "mdi:earth",
      prefix: "wiki/",
      link: "wiki/",
      children: "structure",
    },
    {
      text: "除此之外...",
      icon: "eos-icons:miscellaneous",
      prefix: "misc/",
      link: "misc/",
    },
    
  ],
});
