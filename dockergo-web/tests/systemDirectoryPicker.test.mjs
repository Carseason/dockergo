import assert from "node:assert/strict"
import test from "node:test"
import { selectSystemDirectory } from "../src/systemDirectoryPicker.ts"

test("loads the LuCI directory picker without a view bridge", async () => {
  const pickerElement = new EventTarget()
  pickerElement.querySelector = () => ({
    click() {
      queueMicrotask(() =>
        pickerElement.dispatchEvent(
          new CustomEvent("cbi-fileupload-select", {
            detail: { path: "/mnt/storage/dockergo" },
          }),
        ),
      )
    },
  })

  class FileUpload {
    render() {
      return Promise.resolve(pickerElement)
    }
  }

  globalThis.window = {
    L: {
      require: async (name) => {
        assert.equal(name, "ui")
        return { FileUpload, showModal() {}, hideModal() {} }
      },
    },
  }
  globalThis.document = {
    getElementById: () => null,
    createElement: () => ({
      addEventListener() {},
      append() {},
      style: {},
    }),
  }

  assert.equal(
    await selectSystemDirectory("/docker/apps/nginx"),
    "/mnt/storage/dockergo",
  )
})
