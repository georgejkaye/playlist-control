import { readFile, readFileSync } from "fs"

export const getSecretSync = (secretFile: string) =>
  readFileSync(secretFile, "utf8").replace("\n", "")

export const getSecret = (secretFile: string) => {
  return new Promise<string>((resolve, reject) => {
    readFile(secretFile, "utf8", (err, data) => {
      if (err) {
        reject(err)
      } else {
        let line = data.replace("\n", "")
        resolve(line)
      }
    })
  })
}
