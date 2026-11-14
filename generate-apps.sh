#!/bin/sh
set -eu

if [ "$#" -ne 0 ]; then
    printf '用法：%s\n将 datas/apps.yaml 转为包含顶层 tags 的 datas/apps.json，不构建前端或上传 CDN。\n' "$0" >&2
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

printf '安装目录生成工具依赖（使用锁文件）…\n'
pnpm install --frozen-lockfile --prod=false

printf '生成 CDN 应用目录…\n'
pnpm run data:generate
