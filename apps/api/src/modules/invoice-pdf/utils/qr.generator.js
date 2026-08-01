import QRCode from 'qrcode'

export async function generateQR(data) {
  return await QRCode.toDataURL(data)
}
