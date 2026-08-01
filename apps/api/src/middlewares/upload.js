import multer from "multer"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploadDir = path.join(__dirname, "../../uploads/company")

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Crear carpeta si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // 🔥 BORRAR TODO lo que haya dentro
    const files = fs.readdirSync(uploadDir)
    for (const file of files) {
      fs.unlinkSync(path.join(uploadDir, file))
    }

    cb(null, uploadDir)
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `logo${ext}`)
  }
})

export const upload = multer({ storage })
