import { readFile, readFileSync } from "fs"

export const getSecretSync = (secretFile: string) =>
  readFileSync(secretFile, "utf8").replace("\n", "")

export const getSecret = (secretFile: string) => {
  console.log(`The secret file is ${secretFile}`)
  return new Promise<string>((resolve, reject) => {
    readFile(secretFile, "utf8", (err, data) => {
      if (err) {
        console.log(`Could not read secret file '${secretFile}'`)
        reject(err)
      } else {
        let line = data.replace("\n", "")
        resolve(line)
      }
    })
  })
}
