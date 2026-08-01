import archiver from "archiver"

export const generateSalesZIP = (res, files) => {

  const archive = archiver("zip")

  res.setHeader("Content-Type", "application/zip")
  res.setHeader("Content-Disposition", "attachment; filename=reportes.zip")

  archive.pipe(res)

  files.forEach(file => {
    archive.append(file.content, { name: file.name })
  })

  archive.finalize()
}
