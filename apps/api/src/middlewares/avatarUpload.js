import multer from "multer"
import path from "path"
import fs from "fs"
import crypto from "crypto"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadDir = path.join(__dirname, "../../uploads/avatars")

// A diferencia del logo de empresa, aquí conviven fotos de muchos usuarios
// de muchas empresas distintas en la misma carpeta: cada archivo necesita
// un nombre único (no se puede fijar ni borrar todo el directorio).
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const userId = req.user?.id ?? "user"
    const unique = crypto.randomBytes(6).toString("hex")
    cb(null, `${userId}-${Date.now()}-${unique}${ext}`)
  }
})

export const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("El archivo debe ser una imagen"))
    }
    cb(null, true)
  }
})
