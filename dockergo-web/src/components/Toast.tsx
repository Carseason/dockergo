import { Check } from "@phosphor-icons/react"

export function Toast({ appName }: { appName: string }) {
  return (
    <div className="toast" role="status">
      <span>
        <Check size={15} weight="bold" />
      </span>
      <div>
        <strong>部署任务已完成</strong>
        <p>{appName} 已成功安装并运行</p>
      </div>
    </div>
  )
}
