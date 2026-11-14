#!/bin/sh
set -eu

if [ "$#" -ne 0 ]; then
    printf '用法：%s\n仅将前端编译到 luci-app-dockergo，不转换应用目录或构建 IPK/APK。\n' "$0" >&2
    exit 2
fi

for tool in node pnpm; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        printf '错误：未找到 %s，请先安装 Node.js 和项目要求的 pnpm。\n' "$tool" >&2
        exit 1
    fi
done

project_dir=$(CDPATH= cd -P "$(dirname "$0")" && pwd)
cd "$project_dir/dockergo-web"

printf '安装前端依赖（使用锁文件，包含构建工具）…\n'
pnpm install --frozen-lockfile --prod=false

printf '检查类型并编译 LuCI 前端资源…\n'
pnpm run build:luci

printf '构建完成：%s/luci-app-dockergo/htdocs/luci-static/resources/dockergo/app\n' "$project_dir"
