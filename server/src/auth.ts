import { getSecret } from "./utils.js"
import bcrypt from "bcryptjs"
import jwt, { JwtPayload } from "jsonwebtoken"
import { getPasswordHash } from "./database.js"

export const tokenExpiresMinutes = 30

const secretKeyFile = process.env.SECRET_KEY || "api.secret"
const secretKey = await getSecret(secretKeyFile)

const compareWithAdminPassword = (password: string, hashedPassword: string) => {
  return new Promise<boolean>((resolve, reject) => {
    bcrypt.compare(password, hashedPassword, (err, same) => {
      if (err) {
        reject(err)
      } else {
        resolve(same)
      }
    })
  })
}

export const authenticateUser = async (username: string, password: string) => {
  return new Promise<boolean>(async (resolve, reject) => {
    let hashedPassword = await getPasswordHash(username)
    if (!hashedPassword) {
      resolve(false)
    } else {
      let same = await compareWithAdminPassword(password, hashedPassword)
      resolve(same)
    }
  })
}

export const generateToken = (user: string) =>
  new Promise((resolve, reject) => {
    jwt.sign(
      { sub: user },
      secretKey,
      {
        expiresIn: tokenExpiresMinutes * 60,
      },
      (error, encoded) => {
        if (error) {
          reject(error)
        } else if (encoded) {
          resolve(encoded)
        } else {
          reject(false)
        }
      }
    )
  })

export const verifyToken = async (token: string) =>
  new Promise<JwtPayload>((resolve, reject) => {
    jwt.verify(token, secretKey, (error, decoded) => {
      if (error) {
        reject(error)
      } else if (decoded) {
        if (typeof decoded === "string") {
          reject(false)
        } else {
          resolve(decoded)
        }
      } else {
        reject(false)
      }
    })
  })
