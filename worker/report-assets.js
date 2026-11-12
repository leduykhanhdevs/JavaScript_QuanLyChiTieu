import regularFont from './assets/BeVietnamPro-Regular.bin';
import boldFont from './assets/BeVietnamPro-Bold.bin';
import brandMark from './assets/brand-mark.bin';

export const reportAssets = Object.freeze({
  regularFont: Buffer.from(regularFont),
  boldFont: Buffer.from(boldFont),
  brandMark: Buffer.from(brandMark)
});
