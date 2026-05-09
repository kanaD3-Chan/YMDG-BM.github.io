---
title: 第零幕：MySQL 环境配置
order: 0
category:
  - 数据库
---

开发环境用 Docker Compose 一键部署 MySQL，省去手动安装配置的繁琐。

<!-- more -->

## Docker Compose 部署

```yaml
# ~/mysql/docker-compose.yml
version: "3.8"
services:
  mysql:
    image: mysql:latest
    container_name: mysql-server
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: mysecretpassword
    volumes:
      - ${HOME}/mysql/mysql:/var/lib/mysql
    ports:
      - "3306:3306"
```

启动：

```bash
cd ~/mysql
docker compose up -d
```

## 连接方式

```bash
# 进入容器内执行 SQL
docker exec -it mysql-server mysql -u root -p

# 宿主机上程序连接（Rust / Python）
# Host: localhost:3306
# User: root
# Password: mysecretpassword
```

Rust 项目中通过 `.env` 配置连接字符串：

```
DATABASE_URL="mysql://root:mysecretpassword@localhost:3306/express_station"
```

## 关键信息速查

| 项目 | 值 |
|---|---|
| 容器名 | `mysql-server` |
| 端口映射 | `3306:3306` |
| root 密码 | `mysecretpassword` |
| 数据持久化 | `~/mysql/mysql` → 容器内 `/var/lib/mysql` |
| 重启策略 | `unless-stopped` |

::: warning 学习环境 vs 生产环境
学习环境密码简单就行。生产环境务必使用强密码，且不要将 `.env` 文件提交到版本控制。
:::
