# DockerGo Web

DockerGo 的应用市场前端。项目使用 React、TypeScript 和 Vite，提供应用搜索、分类筛选、安装配置、部署进度和已安装应用视图。

## 开发

```bash
pnpm install
pnpm dev
```

默认开发地址为 `http://localhost:5173`。

## 检查与构建

```bash
pnpm check
pnpm build
```

## 项目结构

- `src/components`：页面组件和安装弹窗
- `src/data`：应用目录数据
- `src/hooks`：安装流程状态与副作用
- `src/types.ts`：共享领域类型
- `src/styles.css`：全局设计令牌、组件样式和响应式规则

## 重构说明

该项目由 Figma Make 导出原型重构而来。新项目不依赖 Figma 的运行时、预览插件、配置文件或 HTML 注入占位符，使用标准 Vite 配置独立运行。
