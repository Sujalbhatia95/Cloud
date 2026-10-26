/**
 * Inspects a ZIP container's central directory (an .xlsx file is a ZIP) *before* it is
 * decompressed, rejecting archives that would expand to an unreasonable size (zip bombs).
 */
export type ZipCheck = { ok: true; entries: number; uncompressed: number } | { ok: false; error: string };

export function checkZip(buf: Buffer, limits = { maxEntries: 5_000, maxUncompressed: 150 * 1024 * 1024, maxRatio: 200 }): ZipCheck {
  // Locate End Of Central Directory record (signature 0x06054b50) within the last 64 KB + 22 bytes.
  const minEocd = Math.max(0, buf.length - 65_557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= minEocd; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return { ok: false, error: "The file is not a valid .xlsx workbook (damaged or not a ZIP container)." };
  const entries = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (entries === 0xffff || cdOffset === 0xffffffff) return { ok: false, error: "ZIP64 workbooks are not supported." };
  if (entries > limits.maxEntries) return { ok: false, error: "The workbook contains too many internal parts." };
  if (cdOffset + cdSize > buf.length) return { ok: false, error: "The workbook is truncated or damaged." };

  let p = cdOffset;
  let total = 0;
  for (let n = 0; n < entries; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50)
      return { ok: false, error: "The workbook's internal directory is damaged." };
    const flags = buf.readUInt16LE(p + 8);
    const compressed = buf.readUInt32LE(p + 20);
    const uncompressed = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    if (flags & 0x1) return { ok: false, error: "Password-protected / encrypted workbooks are not supported. Remove the password and upload again." };
    total += uncompressed;
    if (total > limits.maxUncompressed) return { ok: false, error: "The workbook expands to an unsafe size and was rejected." };
    if (compressed > 0 && uncompressed / compressed > limits.maxRatio && uncompressed > 1024 * 1024)
      return { ok: false, error: "The workbook has a suspicious compression ratio and was rejected." };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { ok: true, entries, uncompressed: total };
}
