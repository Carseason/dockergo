declare global {
  interface Window {
    taskd?: {
      show_log: (
        taskId: string,
        nohide: boolean,
        onExit?: (exitCode: number) => void,
      ) => void
    }
  }
}

export function showSystemTaskLog(
  taskId: string,
  onExit: (exitCode: number) => void,
) {
  if (!window.taskd?.show_log) {
    throw new Error("系统任务日志组件尚未加载")
  }

  window.taskd.show_log(taskId, true, onExit)
}
